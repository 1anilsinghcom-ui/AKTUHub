"use client"

import { useState, useCallback } from "react"
import { Download, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import imageCompression from "browser-image-compression"

interface CompressionResult {
  success: boolean
  originalSize: number
  compressedSize: number
  blob?: Blob
  error?: string
}

export function FileCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [originalSize, setOriginalSize] = useState<number>(0)
  const [targetMB, setTargetMB] = useState<string>("")
  const [targetKB, setTargetKB] = useState<string>("")
  const [isCompressing, setIsCompressing] = useState(false)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string>("")
  const [warning, setWarning] = useState<string>("")

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setOriginalSize(selectedFile.size)
      setTargetMB("")
      setTargetKB("")
      setError("")
      setWarning("")
      setResult(null)
    }
  }, [])

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

    const mb = parseFloat(targetMB)
    const kb = parseFloat(targetKB)

    if (!targetMB && !targetKB) {
      setError("Please enter your target size in MB or KB")
      return false
    }

    const targetBytes = targetMB ? mb * 1024 * 1024 : kb * 1024

    if (targetBytes < 1024) {
      setError("Target size too small — minimum is 1 KB")
      return false
    }

    if (targetBytes > originalSize) {
      setWarning("Target size is larger than original file. No compression needed.")
      return true
    }

    return true
  }, [file, targetMB, targetKB, originalSize])

  const compressFile = useCallback(async () => {
    if (!validateInputs()) return

    if (!file) return

    setIsCompressing(true)
    setError("")
    setWarning("")

    try {
      const targetBytes = targetMB ? parseFloat(targetMB) * 1024 * 1024 : parseFloat(targetKB) * 1024
      const targetMBValue = targetBytes / (1024 * 1024)

      if (file.type === "application/pdf") {
        // For PDFs, use the existing compress-pdf API
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/compress-pdf", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!data.success) {
          setError("PDF compression failed")
          setIsCompressing(false)
          return
        }

        const compressedBlob = new Blob([Buffer.from(data.fileBase64, "base64")], {
          type: "application/pdf",
        })

        setResult({
          success: true,
          originalSize,
          compressedSize: compressedBlob.size,
          blob: compressedBlob,
        })
      } else if (file.type.startsWith("image/")) {
        // For images, use browser-image-compression
        const compressed = await imageCompression(file, {
          maxSizeMB: targetMBValue,
          useWebWorker: true,
          fileType: file.type,
        })

        setResult({
          success: true,
          originalSize,
          compressedSize: compressed.size,
          blob: compressed,
        })
      } else {
        setError("Unsupported file type. Please upload an image or PDF.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed")
    } finally {
      setIsCompressing(false)
    }
  }, [file, targetMB, targetKB, originalSize, validateInputs])

  const handleDownload = useCallback(() => {
    if (!result?.blob || !file) return

    const url = URL.createObjectURL(result.blob)
    const a = document.createElement("a")
    const ext = file.name.split(".").pop() || "file"
    a.href = url
    a.download = `compressed_${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [result, file])

  const handleReset = useCallback(() => {
    setFile(null)
    setOriginalSize(0)
    setTargetMB("")
    setTargetKB("")
    setError("")
    setWarning("")
    setResult(null)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(2)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }

  const savedPercent = result
    ? Math.round(((originalSize - result.compressedSize) / originalSize) * 100)
    : 0

  const isCompressDisabled =
    !file || (!targetMB && !targetKB) || isCompressing || !!result

  return (
    <div className="w-full max-w-2xl space-y-5">
      {/* File Upload */}
      <div className="rounded-xl border border-white/10 bg-[#0e1729]/80 p-5 transition-all duration-300 hover:border-cyan-300/40 hover:bg-[#111d34]">
        <label className="block text-sm font-bold text-white mb-3">Select File to Compress</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          disabled={!!result}
          className="block w-full text-sm text-slate-400 file:mr-4 file:px-4 file:py-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-200 hover:file:bg-cyan-500/30 disabled:opacity-50"
        />
        {originalSize > 0 && !result && (
          <p className="mt-3 text-xs text-slate-400">
            Original size: <span className="font-bold text-white">{formatBytes(originalSize)}</span>{" "}
            ({Math.round(originalSize / 1024).toLocaleString()} KB)
          </p>
        )}
      </div>

      {/* Target Size Input */}
      {file && !result && (
        <div className="rounded-xl border border-white/10 bg-[#0e1729]/80 p-5 transition-all duration-300 hover:border-cyan-300/40 hover:bg-[#111d34]">
          <label className="block text-sm font-bold text-white mb-4">Target Size</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* MB Input */}
            <div>
              <label htmlFor="mb-input" className="block text-xs font-medium text-slate-300 mb-2">
                MB
              </label>
              <input
                id="mb-input"
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
              <label htmlFor="kb-input" className="block text-xs font-medium text-slate-300 mb-2">
                KB
              </label>
              <input
                id="kb-input"
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

      {/* Compress Button */}
      {file && !result && (
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

      {/* Result Card */}
      {result && result.success && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-emerald-200">Compression Complete</h3>
          </div>

          <div className="space-y-2 mb-4 text-sm">
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
              <span className="font-bold text-emerald-300">{savedPercent}% smaller</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Download Compressed File
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-white/[0.1]"
            >
              <RotateCcw className="h-4 w-4" />
              Compress Another
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!file && !result && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-slate-400">
            Select an image or PDF file to get started with compression
          </p>
        </div>
      )}
    </div>
  )
}
