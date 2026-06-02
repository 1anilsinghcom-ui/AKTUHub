"use client"

/**
 * PipelineProgressBar — shown while files are being processed.
 * Displays current file name, step message, and overall progress.
 */

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProcessingProgress } from "./processing-pipeline"

interface Props {
  progress: ProcessingProgress
  className?: string
}

const STEP_MESSAGES = [
  "Splitting PDF…",
  "Classifying…",
  "Cropping photo…",
  "Compressing…",
  "Finalizing…",
]

export function PipelineProgressBar({ progress, className }: Props) {
  const overallPct = Math.round(
    ((progress.fileIndex + progress.percent / 100) / progress.totalFiles) * 100,
  )

  return (
    <div
      className={cn(
        "rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Processing ${progress.fileName}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-purple-400" aria-hidden="true" />
        <p className="text-sm font-bold text-white">
          Processing file {progress.fileIndex + 1} of {progress.totalFiles}
        </p>
      </div>

      {/* File name */}
      <p className="truncate text-xs text-slate-400">{progress.fileName}</p>

      {/* Step message */}
      <p className="text-xs font-semibold text-purple-300">{progress.message}</p>

      {/* Per-file progress */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
          <span>File progress</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-purple-400 transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Overall progress */}
      {progress.totalFiles > 1 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>Overall</span>
            <span>{overallPct}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
