"use client"

import { AlertTriangle, ArrowRight, CheckCircle2, Download, Loader2, ShieldCheck, Trash2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { DOC_SPECS, formatBytes, getSpec } from "@/lib/aktu"
import { explainItem, getPipelineStep } from "@/lib/enrollment-engine"
import type { DocItem } from "./types"

interface Props {
  item: DocItem
  rollNumber: string
  onChangeType: (id: string, docKey: string) => void
  onRemove: (id: string) => void
  onDownload: (id: string) => void
}

export function DocumentCard({ item, rollNumber, onChangeType, onRemove, onDownload }: Props) {
  const spec = getSpec(item.docKey)
  const targetLabel =
    spec.category === "document"
      ? `≤ ${spec.maxKB} KB · PDF`
      : `${spec.minKB}–${spec.maxKB} KB · JPG`

  const previewSrc = item.result?.previewUrl ?? item.originalPreviewUrl
  const isBusy = item.status === "processing" || item.status === "queued"
  const pipelineStep = getPipelineStep(item.status)
  const explanation = explainItem(item)
  const qualityScore =
    item.status === "ok" ? 100 : item.status === "flagged" ? Math.max(60, 92 - (item.result?.flags.length ?? 1) * 10) : item.status === "error" ? 0 : 45

  return (
    <div className="lift animate-card-enter rounded-xl frost-card p-3 sm:p-4 transition-all duration-300">
      <div className="flex gap-3 sm:gap-4">
        {/* thumbnail */}
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] sm:size-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc || "/placeholder.svg"}
            alt={`${spec.label} preview`}
            className={cn("size-full object-cover transition-opacity", isBusy && "opacity-40")}
          />
          {isBusy ? <div className="skeleton absolute inset-0" aria-hidden="true" /> : null}
        </div>
 
        {/* main */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Select value={item.docKey} onValueChange={(v) => onChangeType(item.id, v)}>
                <SelectTrigger className="h-8 w-[190px] max-w-full text-sm glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_SPECS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label} · {s.labelHi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 truncate text-xs text-slate-400" title={item.file.name}>
                {item.file.name}
              </p>
              <p className="mt-1 text-xs text-purple-300">
                Auto-detected {item.detectionConfidence ?? 0}% confidence
              </p>
            </div>
 
            <StatusBadge item={item} />
          </div>
 
          {/* size comparison */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-slate-400">{formatBytes(item.originalSize)}</span>
            {item.result ? (
              <>
                <ArrowRight className="size-3 text-slate-400" aria-hidden="true" />
                <span
                  className={cn(
                    "font-semibold",
                    item.status === "ok" ? "text-emerald-400" : "text-white",
                  )}
                >
                  {formatBytes(item.result.size)}
                </span>
                <Badge className="ml-1 font-bold border-purple-500/20 bg-purple-500/10 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                  {targetLabel}
                </Badge>
                {item.originalSize > item.result.size ? (
                  <span className="text-emerald-400">
                    −{Math.round((1 - item.result.size / item.originalSize) * 100)}%
                  </span>
                ) : null}
              </>
            ) : (
              <Badge className="font-bold border-purple-500/20 bg-purple-500/10 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                target {targetLabel}
              </Badge>
            )}
          </div>
 
          <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-white/[0.015] p-3 sm:grid-cols-[130px_1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Readiness</p>
              <p className="mt-1 text-lg font-black text-white">{qualityScore}%</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>Uploaded</span>
                <span>Detecting</span>
                <span>Validating</span>
                <span>Ready</span>
              </div>
              <div className="mt-2 grid grid-cols-6 gap-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "pipeline-step h-1.5 rounded-full transition-all duration-400",
                      index + 1 <= pipelineStep ? "active" : "bg-white/8",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
 
          {item.detectionReason ? (
            <p className="mt-2 rounded-md border border-purple-500/20 bg-purple-500/5 px-2.5 py-2 text-xs text-slate-300">
              {item.detectionReason}
            </p>
          ) : null}
 
          {/* processing progress */}
          {isBusy ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="progress-track h-1.5 flex-1">
                <span className="progress-bar" />
              </div>
              <span className="text-xs text-slate-400">Processing…</span>
            </div>
          ) : null}
 
          {/* flags */}
          {item.result?.flags?.length ? (
            <ul className="mt-2 space-y-1">
              {item.result.flags.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-200/90">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-400" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {item.result?.autoFixes?.length ? (
            <ul className="mt-2 space-y-1">
              {item.result.autoFixes.map((fix, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-200/90">
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {item.error ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-300">
              <XCircle className="mt-0.5 size-3 shrink-0 text-rose-400" aria-hidden="true" />
              {item.error}
            </p>
          ) : null}
 
          {item.status !== "queued" ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.015] backdrop-blur-md p-3 text-xs leading-5 text-slate-300">
              <p className="flex items-center gap-1.5 font-bold text-slate-100">
                <ShieldCheck className="size-3.5 text-purple-400" aria-hidden="true" />
                Engine explanation
              </p>
              <p className="mt-2"><span className="font-semibold text-slate-400">What:</span> {explanation.problem}</p>
              <p><span className="font-semibold text-slate-400">Why:</span> {explanation.reason}</p>
              <p><span className="font-semibold text-slate-400">Auto-fix:</span> {explanation.autoFix}</p>
              <p><span className="font-semibold text-slate-400">Action:</span> {explanation.action}</p>
            </div>
          ) : null}
 
          {/* output filename */}
          {item.result && item.status !== "error" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="truncate font-mono text-xs text-purple-300 font-bold">
                {rollNumber.trim() || "processed"}_{spec.key.toUpperCase()}.{item.result.ext}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs btn-glossy"
                onClick={() => onDownload(item.id)}
              >
                <Download className="size-3" aria-hidden="true" />
                Download
              </Button>
            </div>
          ) : null}
        </div>
 
        {/* remove */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
          onClick={() => onRemove(item.id)}
          aria-label="Remove document"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
 
function StatusBadge({ item }: { item: DocItem }) {
  if (item.status === "processing" || item.status === "queued") {
    return (
      <Badge variant="secondary" className="gap-1 border-purple-500/20 bg-purple-500/10 text-purple-200">
        <Loader2 className="size-3 animate-spin text-purple-400" aria-hidden="true" />
        Processing
      </Badge>
    )
  }
  if (item.status === "ok") {
    return (
      <Badge className="gap-1 bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30">
        <CheckCircle2 className="size-3 animate-pop text-emerald-400" aria-hidden="true" />
        Ready
      </Badge>
    )
  }
  if (item.status === "flagged") {
    return (
      <Badge className="gap-1 bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30">
        <AlertTriangle className="size-3 text-amber-400" aria-hidden="true" />
        Check
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1 bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30">
      <XCircle className="size-3 text-rose-400" aria-hidden="true" />
      Error
    </Badge>
  )
}
