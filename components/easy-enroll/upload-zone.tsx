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
        "group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all duration-300",
        "border-purple-500/30 bg-purple-500/[0.04] shadow-lg shadow-purple-950/15 ring-1 ring-purple-400/15",
        "hover:border-purple-400/60 hover:bg-purple-500/[0.08] hover:shadow-xl hover:shadow-purple-500/10 hover:ring-purple-400/35",
        isDragActive &&
          "scale-[1.01] border-purple-400 bg-purple-500/10 shadow-2xl shadow-purple-500/20 ring-2 ring-purple-400/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
      role="button"
      aria-label="Upload documents"
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "flex size-20 items-center justify-center rounded-2xl bg-purple-400/20 text-purple-300 transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-400/30 group-hover:shadow-lg group-hover:shadow-purple-500/30",
          isDragActive && "animate-float",
        )}
      >
        <UploadCloud className="size-10" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-bold text-white sm:text-lg">
          {isDragActive ? "Drop the files here" : "Drag & drop documents, or click to browse"}
        </p>
        <p className="mt-2 text-sm text-purple-200/60">
          Photos, signatures &amp; certificates · JPG, PNG, WebP, HEIC, PDF · up to 10 MB each
        </p>
      </div>
    </div>
  )
}
