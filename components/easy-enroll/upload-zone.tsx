"use client"

import { useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPES, MAX_RAW_BYTES } from "@/lib/aktu"

interface Props {
  onFiles: (files: File[]) => void
  onRejected: (message: string) => void
  disabled?: boolean
}

export function UploadZone({ onFiles, onRejected, disabled }: Props) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        const reason = rejections[0]?.errors[0]?.code
        if (reason === "file-too-large") {
          onRejected("File too large — maximum 10 MB per file.")
        } else if (reason === "file-invalid-type") {
          onRejected("Unsupported file. Upload images (JPG, PNG, WebP, HEIC) or PDF only.")
        } else {
          onRejected("Some files could not be added.")
        }
      }
      if (accepted.length) onFiles(accepted)
    },
    [onFiles, onRejected],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    maxSize: MAX_RAW_BYTES,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"],
      "application/pdf": [".pdf"],
    },
    validator: (file) => {
      const ok =
        ACCEPTED_IMAGE_TYPES.includes(file.type) ||
        ACCEPTED_PDF_TYPES.includes(file.type) ||
        /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(file.name)
      return ok ? null : { code: "file-invalid-type", message: "Unsupported file type" }
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-400",
        // base — subtle frost
        "border-purple-500/25 bg-gradient-to-br from-purple-500/[0.04] to-indigo-500/[0.02]",
        "shadow-[inset_0_0_60px_rgba(139,92,246,0.04)] backdrop-blur-sm",
        // hover
        "hover:border-purple-400/50 hover:bg-purple-500/[0.07]",
        "hover:shadow-[0_0_40px_rgba(139,92,246,0.12),inset_0_0_60px_rgba(139,92,246,0.06)]",
        // drag active
        isDragActive && [
          "scale-[1.01] border-purple-400 bg-purple-500/10",
          "shadow-[0_0_60px_rgba(168,85,247,0.25),inset_0_0_60px_rgba(168,85,247,0.08)]",
          "ring-2 ring-purple-400/50",
        ],
        disabled && "cursor-not-allowed opacity-50",
      )}
      role="button"
      aria-label="Upload documents"
    >
      {/* animated corner accents */}
      <span className="absolute top-3 left-3 size-5 border-t-2 border-l-2 border-purple-500/40 rounded-tl-lg transition-all duration-300 group-hover:border-purple-400/70 group-hover:size-7" />
      <span className="absolute top-3 right-3 size-5 border-t-2 border-r-2 border-purple-500/40 rounded-tr-lg transition-all duration-300 group-hover:border-purple-400/70 group-hover:size-7" />
      <span className="absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-purple-500/40 rounded-bl-lg transition-all duration-300 group-hover:border-purple-400/70 group-hover:size-7" />
      <span className="absolute bottom-3 right-3 size-5 border-b-2 border-r-2 border-purple-500/40 rounded-br-lg transition-all duration-300 group-hover:border-purple-400/70 group-hover:size-7" />

      <input {...getInputProps()} />

      {/* icon */}
      <div
        className={cn(
          "flex size-20 items-center justify-center rounded-2xl transition-all duration-300",
          "bg-purple-400/12 text-purple-300 border border-purple-400/20",
          "group-hover:scale-110 group-hover:bg-purple-400/20 group-hover:border-purple-400/40",
          "group-hover:shadow-[0_0_24px_rgba(168,85,247,0.3)]",
          isDragActive && "animate-float",
        )}
      >
        <UploadCloud className="size-9" aria-hidden="true" />
      </div>

      {/* text */}
      <div className="space-y-2">
        <p className="text-base font-bold text-white sm:text-lg">
          {isDragActive
            ? "Release to process your files"
            : "Drop everything here — Photos, PDFs, Scans, Combined Files"}
        </p>
        <p className="text-sm text-slate-500">
          JPG · PNG · WebP · HEIC · PDF &nbsp;·&nbsp; up to 10 MB each
        </p>
      </div>
    </div>
  )
}
