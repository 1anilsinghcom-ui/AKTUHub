"use client"

import { useState, useCallback, useRef } from "react"
import { Download, RotateCcw, AlertCircle, CheckCircle2, Loader2, FileVideo, FileImage, FileText } from "lucide-react"
import imageCompression from "browser-image-compression"
import { compressPdf } from "../lib/pdf-utils"

interface CompressionResult {
  success: boolean
  originalSize: number
  compressedSize: number
  blob?: Blob
  fileName: string
  fileType: string
  error?: string
}

type FileType = "image" | "pdf" | "video" | "unknown"

const MAX_VIDEO_DURATION_SEC = 30

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
]

const getFileType = (file: File): FileType => {
  if (file.type === "application/pdf") return "pdf"
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) return "image"
  if (file.type.startsWith("video/")) return "video"
  return "unknown"
}

const getFileTypeIcon = (type: FileType) => {
  switch (type) {
    case "image":
      return FileImage
    case "pdf":
      return FileText
    case "video":
      return FileVideo
    default:
      return FileText
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(2)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

// Compress image using canvas
async function compressImage(file: File, targetKB: number): Promise<Blob> {
  const options = {
    maxSizeMB: targetKB / 1024,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
    initialQuality: 0.8,
  }
  return await imageCompression(file, options)
}

// Compress video by re-encoding at lower bitrate
async function compressVideo(
  file: File,
  targetKB: number,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const url = URL.createObjectURL(file)

    video.preload = "metadata"
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const duration = video.duration
      if (duration > MAX_VIDEO_DURATION_SEC) {
        URL.revokeObjectURL(url)
        reject(new Error(`Video is ${duration.toFixed(1)}s long. Only videos under ${MAX_VIDEO_DURATION_SEC}s are supported.`))
        return
      }

      // Set canvas dimensions
      const maxWidth = 1280
      const maxHeight = 720
      let width = video.videoWidth
      let height = video.videoHeight

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      // Calculate target bitrate based on target size
      const targetBits = targetKB * 1024 * 8
      const bitrate = Math.max(100000, Math.floor(targetBits / duration))

      // Use MediaRecorder to capture and compress
      const stream = canvas.captureStream(30)
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm"

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        URL.revokeObjectURL(url)
        const blob = new Blob(chunks, { type: mimeType })
        resolve(blob)
      }

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(new Error("Video recording failed"))
      }

      // Start playing and recording
      video.currentTime = 0
      video.play()
      recorder.start()

      let lastProgress = 0
      const updateProgress = () => {
        if (!video.paused && !video.ended) {
          const progress = Math.floor((video.currentTime / duration) * 100)
          if (progress !== lastProgress && onProgress) {
            onProgress(progress)
            lastProgress = progress
          }
          requestAnimationFrame(updateProgress)
        }
      }
      updateProgress()

      video.onended = () => {
        // Add a small delay to ensure last frame is captured
        setTimeout(() => {
          recorder.stop()
        }, 100)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load video file"))
    }

    video.src = url
  })
}

export function UniversalCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<FileType>("unknown")
  const [originalSize, setOriginalSize] = useState<number>(0)
  const [targetMB, setTargetMB] = useState<string>("")
  const [targetKB, setTargetKB] = useState<string>("")
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [results, setResults] = useState<CompressionResult[]>([])
  const [error, setError] = useState<string>("")
  const [warning, setWarning] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        const type = getFileType(selectedFile)
        if (type === "unknown") {
          setError("Unsupported file type. Please upload an image, PDF, or video file.")
          return
        }

        // Check video duration for video files
        if (type === "video") {
          const video = document.createElement("video")
          video.preload = "metadata"
          video.onloadedmetadata = () => {
            if (video.duration > MAX_VIDEO_DURATION_SEC) {
              setError(`Video is ${video.duration.toFixed(1)}s long. Only videos under ${MAX_VIDEO_DURATION_SEC}s are supported.`)
              return
            }
          }
          video.src = URL.createObjectURL(selectedFile)
        }

        setFile(selectedFile)
        setFileType(type)
        setOriginalSize(selectedFile.size)
        setTargetMB("")
        setTargetKB("")
        setError("")
        setWarning("")
        setResults([])
        setCompressionProgress(0)
      }
    },
    [],
  )

  const handleMBChange = useCallback((value: string) => {
    setTargetMB(value)
    if (value) {
      setTargetKB("")
    }
    setError("")
    setWarning("")
  }, [])

  const handleKBChange = useCallback((value: string) => {
    setTargetKB(value)
    if (value) {
      setTargetMB("")
    }
    setError("")
    setWarning("")
  }, [])

  const validateInputs = useCallback((): boolean => {
    if (!file) {
      setError("Please select a file first")
      return false
    }

    if (!targetMB && !targetKB) {
      setError("Please enter your target size in MB or KB")
      return false
    }

    const mb = parseFloat(targetMB)
    const kb = parseFloat(targetKB)
    const targetBytes = targetMB ? mb * 1024 * 1024 : kb * 1024

    if (targetBytes < 1024) {
      setError("Target size too small — minimum is 1 KB")
      return false
    }

    if (targetBytes > originalSize) {
      setWarning("Target size is larger than original file. Compression may not reduce size significantly.")
    }

    return true
  }, [file, targetMB, targetKB, originalSize])

  const compressFile = useCallback(async () => {
    if (!validateInputs()) return
    if (!file) return

    setIsCompressing(true)
    setError("")
    setWarning("")
    setCompressionProgress(0)

    try {
      const targetBytes = targetMB ? parseFloat(targetMB) * 1024 * 1024 : parseFloat(targetKB) * 1024
      const targetKBValue = targetBytes / 1024
      let compressedBlob: Blob | null = null

      switch (fileType) {
        case "pdf":
          const { blob: pdfBlob } = await compressPdf(file, targetKBValue)
          compressedBlob = pdfBlob
          break

        case "image":
          compressedBlob = await compressImage(file, targetKBValue)
          break

        case "video":
          compressedBlob = await compressVideo(file, targetKBValue, setCompressionProgress)
          break

        default:
          throw new Error("Unsupported file type")
      }

      if (compressedBlob) {
        const result: CompressionResult = {
          success: true,
          originalSize: file.size,
          compressedSize: compressedBlob.size,
          blob: compressedBlob,
          fileName: file.name,
          fileType: file.type,
        }
        setResults((prev) => [...prev, result])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed")
    } finally {
      setIsCompressing(false)
      setCompressionProgress(0)
    }
  }, [file, fileType, targetMB, targetKB, validateInputs])

  const handleDownload = useCallback((result: CompressionResult) => {
    if (!result.blob) return

    const url = URL.createObjectURL(result.blob)
    const a = document.createElement("a")
    const ext = result.fileName.split(".").pop() || "file"
    a.href = url
    a.download = `compressed_${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleDownloadAll = useCallback(() => {
    results.forEach((result, index) => {
      setTimeout(() => handleDownload(result), index * 300)
    })
  }, [results, handleDownload])

  const handleReset = useCallback(() => {
    setFile(null)
    setFileType("unknown")
    setOriginalSize(0)
    setTargetMB("")
    setTargetKB("")
    setError("")
    setWarning("")
    setResults([])
    setCompressionProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const savedPercent = (original: number, compressed: number) =>
    Math.round(((original - compressed) / original) * 100)

  const isCompressDisabled = !file || (!targetMB && !targetKB) || isCompressing

  const getAcceptString = () => {
    return [...SUPPORTED_IMAGE_TYPES, "application/pdf", "video/mp4", "video/webm", "video/quicktime"].join(",")
  }

  const FileIcon = getFileTypeIcon(fileType)

  return (
    <div className="w-full max-w-2xl space-y-5">
      {/* File Upload */}
      <div className="rounded-xl border border-white/10 bg-[#0e1729]/80 p-5 transition-all duration-300 hover:border-cyan-300/40 hover:bg-[#111d34]">
        <label className="block text-sm font-bold text-white mb-3">
          Select File to Compress
          <span className="ml-2 text-xs font-normal text-slate-400">
            (Images, PDF, Videos under {MAX_VIDEO_DURATION_SEC}s)
          </span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          onChange={handleFileSelect}
          disabled={isCompressing}
          className="block w-full text-sm text-slate-400 file:mr-4 file:px-4 file:py-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-200 hover:file:bg-cyan-500/30 disabled:opacity-50"
        />
        {file && (
          <div className="mt-3 flex items-center gap-3">
            <FileIcon className="h-5 w-5 text-cyan-400" />
            <div className="flex-1">
              <p className="text-sm text-white truncate">{file.name}</p>
              <p className="text-xs text-slate-400">
                Original size: <span className="font-bold text-white">{formatBytes(originalSize)}</span>
                {fileType === "video" && (
                  <span className="ml-2 text-slate-500">• Video file</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Target Size Input */}
      {file && results.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[#0e1729]/80 p-5 transition-all duration-300 hover:border-cyan-300/40 hover:bg-[#111d34]">
          <label className="block text-sm font-bold text-white mb-4">Target Size</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* MB Input */}
            <div>
              <label htmlFor="universal-mb-input" className="block text-xs font-medium text-slate-300 mb-2">
                MB
              </label>
              <input
                id="universal-mb-input"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                placeholder="e.g. 2.5"
                value={targetMB}
                onChange={(e) => handleMBChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-300/50 focus:bg-white/[0.08]"
              />
            </div>

            {/* KB Input */}
            <div>
              <label htmlFor="universal-kb-input" className="block text-xs font-medium text-slate-300 mb-2">
                KB
              </label>
              <input
                id="universal-kb-input"
                type="number"
                min="1"
                max="99999"
                step="1"
                placeholder="e.g. 500"
                value={targetKB}
                onChange={(e) => handleKBChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-300/50 focus:bg-white/[0.08]"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Fill only one — MB for large files, KB for small files
          </p>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Warning Messages */}
      {warning && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300/20 bg-yellow-500/10 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-400 mt-0.5" />
          <p className="text-sm text-yellow-200">{warning}</p>
        </div>
      )}

      {/* Compression Progress */}
      {isCompressing && compressionProgress > 0 && (
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cyan-200">Compressing...</span>
            <span className="text-sm font-bold text-cyan-300">{compressionProgress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${compressionProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Compress Button */}
      {file && results.length === 0 && (
        <button
          onClick={compressFile}
          disabled={isCompressDisabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompressing && <Loader2 className="h-4 w-4 animate-spin" />}
          {isCompressing
            ? "Compressing..."
            : `Compress to ${targetMB ? `${targetMB} MB` : targetKB ? `${targetKB} KB` : "..."}`}
        </button>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-emerald-200">Compression Complete</h3>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">File:</span>
                  <span className="font-bold text-white truncate max-w-[200px]">{result.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Original:</span>
                  <span className="font-bold text-white">{formatBytes(result.originalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Result:</span>
                  <span className="font-bold text-emerald-300">{formatBytes(result.compressedSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Saved:</span>
                  <span className="font-bold text-emerald-300">{savedPercent(result.originalSize, result.compressedSize)}% smaller</span>
                </div>
              </div>

              <button
                onClick={() => handleDownload(result)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Download Compressed File
              </button>
            </div>
          ))}

          <div className="flex gap-3">
            {results.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download All
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-white/[0.1]"
            >
              <RotateCcw className="h-4 w-4" />
              Compress Another
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!file && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="flex justify-center gap-4 mb-4">
            <FileImage className="h-8 w-8 text-slate-500" />
            <FileText className="h-8 w-8 text-slate-500" />
            <FileVideo className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">
            Select an image, PDF, or short video (under {MAX_VIDEO_DURATION_SEC}s) to compress
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Supported: JPEG, PNG, WebP, GIF, PDF, MP4, WebM
          </p>
        </div>
      )}
    </div>
  )
}