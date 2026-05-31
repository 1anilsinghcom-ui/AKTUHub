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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          Enrollment Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {doneCount} of {requiredSpecs.length} mandatory documents (optional)
            </span>
            <span className="font-semibold text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <ul className="space-y-1.5">
          {requiredSpecs.map((s) => {
            const done = processedKeys.has(s.key)
            return (
              <li key={s.key} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    done ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3" /> : <Minus className="size-3" />}
                </span>
                <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          {criticalIssues.length ? (
            <div className="mb-3 rounded-lg border border-red-300/20 bg-red-400/10 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-red-200">Failed files</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-red-100/90">
                {criticalIssues.map((issue) => (
                  <li key={issue}>- {issue}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-red-100/80">
                Other processed files can still be downloaded.
              </p>
            </div>
          ) : null}
          <Button
            className={cn(
              "w-full gap-2",
              canDownload
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-secondary text-muted-foreground",
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
          <p className="mt-2 text-center text-xs text-muted-foreground">
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
