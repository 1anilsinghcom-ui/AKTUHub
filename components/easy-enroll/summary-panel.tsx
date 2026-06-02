"use client"

import { Check, Download, ListChecks, Loader2, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { DOC_SPECS } from "@/lib/aktu"
import type { DocItem } from "./types"

interface Props {
  items: DocItem[]
  onDownload: () => void
  downloading: boolean
  canDownload: boolean
  downloadableCount: number
  pendingCount: number
  criticalIssues: string[]
}

export function SummaryPanel({
  items,
  onDownload,
  downloading,
  canDownload,
  downloadableCount,
  pendingCount,
  criticalIssues,
}: Props) {
  const requiredSpecs = DOC_SPECS.filter((s) => s.required)
  const processedKeys = new Set(
    items.filter((i) => i.status === "ok" || i.status === "flagged").map((i) => i.docKey),
  )
  const doneCount = requiredSpecs.filter((s) => processedKeys.has(s.key)).length
  const pct = Math.round((doneCount / requiredSpecs.length) * 100)
  const isSingleFile = downloadableCount === 1
  const downloadLabel = downloading
    ? isSingleFile
      ? "Preparing file…"
      : "Building ZIP…"
    : isSingleFile
      ? "Download File"
      : downloadableCount > 1
        ? "Download ZIP"
        : "Download"

  return (
    <Card className="glass-panel overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/10 bg-white/[0.01]">
        <CardTitle className="flex items-center gap-2 text-base text-white font-black">
          <ListChecks className="size-4 text-purple-400" aria-hidden="true" />
          Enrollment Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {doneCount} of {requiredSpecs.length} mandatory documents (optional)
            </span>
            <span className="font-bold text-purple-300">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
 
        <ul className="space-y-2">
          {requiredSpecs.map((s) => {
            const done = processedKeys.has(s.key)
            return (
              <li key={s.key} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    done 
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" 
                      : "bg-white/[0.02] border-white/10 text-slate-500",
                  )}
                >
                  {done ? <Check className="size-3" /> : <Minus className="size-3" />}
                </span>
                <span className={cn(done ? "text-slate-200 font-medium" : "text-slate-500")}>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
 
        <div className="rounded-lg border border-white/10 bg-white/[0.015] p-3">
          {criticalIssues.length ? (
            <div className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-200">Failed files</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-rose-200/90">
                {criticalIssues.map((issue) => (
                  <li key={issue}>- {issue}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-rose-200/80">
                Other processed files can still be downloaded.
              </p>
            </div>
          ) : null}
          <Button
            className={cn(
              "w-full gap-2",
              canDownload
                ? "btn-glossy"
                : "bg-white/[0.03] border border-white/10 text-slate-500 cursor-not-allowed",
            )}
            disabled={!canDownload || downloading}
            onClick={onDownload}
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            {downloadLabel}
          </Button>
          <p className="mt-2.5 text-center text-xs text-slate-400 leading-normal">
            {!canDownload
              ? pendingCount > 0
                ? "Processing in progress…"
                : "Upload a file to enable download"
              : isSingleFile
                ? "1 processed file ready — direct download"
                : `${downloadableCount} files ready — packaged as ZIP${pendingCount > 0 ? ` (${pendingCount} still processing)` : ""}`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
