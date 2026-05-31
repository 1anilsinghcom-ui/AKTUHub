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
        "group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/30 px-6 py-12 text-center transition-all duration-300",
        "hover:border-primary/60 hover:bg-secondary/50",
        isDragActive && "scale-[1.01] border-primary bg-accent shadow-xl shadow-primary/20",
        disabled && "cursor-not-allowed opacity-60",
      )}
      role="button"
      aria-label="Upload documents"
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110",
          isDragActive && "animate-float",
        )}
      >
        <UploadCloud className="size-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {isDragActive ? "Drop the files here" : "Drag & drop documents, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Photos, signatures &amp; certificates · JPG, PNG, WebP, HEIC, PDF · up to 10 MB each
        </p>
      </div>
    </div>
  )
}
