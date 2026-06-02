"use client"

/**
 * UnclassifiedTray — holds all docs that haven't been assigned to a slot yet,
 * or docs dragged out of slots back into the tray.
 *
 * Each item is draggable so it can be dropped onto a SlotCard.
 */

import { useState, useCallback } from "react"
import { GripVertical, AlertTriangle, CheckCircle2, XCircle, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBytes } from "@/lib/aktu"
import type { ProcessedDoc } from "./processing-pipeline"

interface Props {
  docs: ProcessedDoc[]
  onDrop: (docId: string, targetSlotKey: string) => void
}

export function UnclassifiedTray({ docs, onDrop }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const docId = e.dataTransfer.getData("docId")
      if (docId) {
        // Drop back into tray — signal with special key "unassigned"
        onDrop(docId, "unassigned")
      }
    },
    [onDrop],
  )

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        isDragOver
          ? "border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/30"
          : "border-white/10 bg-white/[0.02]",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Unclassified documents tray"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Inbox className="size-4 text-cyan-400" aria-hidden="true" />
        <p className="text-sm font-black text-white">Unclassified / Extra</p>
        {docs.length > 0 && (
          <span className="ml-auto rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-300">
            {docs.length}
          </span>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Inbox className="size-8 text-slate-700" aria-hidden="true" />
          <p className="text-xs text-slate-600">All documents assigned — or drop extras here</p>
        </div>
      ) : (
        <div className="space-y-1.5 p-3">
          {docs.map((doc) => (
            <TrayItem key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}

function TrayItem({ doc }: { doc: ProcessedDoc }) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("docId", doc.id)
      e.dataTransfer.setData("sourceSlotKey", "unassigned")
      e.dataTransfer.effectAllowed = "move"
    },
    [doc.id],
  )

  return (
    <div
      className="flex cursor-grab items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.025] p-2 active:cursor-grabbing hover:border-white/20 hover:bg-white/[0.04] transition-colors"
      draggable
      onDragStart={handleDragStart}
    >
      <GripVertical className="size-3 shrink-0 text-slate-600" aria-hidden="true" />

      {/* Preview thumbnail */}
      <div className="relative size-9 shrink-0 overflow-hidden rounded border border-white/10 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={doc.previewUrl}
          alt={doc.file.name}
          className="size-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-300">{doc.file.name}</p>
        <p className="text-[10px] text-slate-500">
          {doc.docKey} · {formatBytes(doc.size)} · {doc.confidence}% conf.
        </p>
      </div>

      <StatusIcon status={doc.status} />
    </div>
  )
}

function StatusIcon({ status }: { status: ProcessedDoc["status"] }) {
  if (status === "ok") return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
  if (status === "flagged") return <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
  return <XCircle className="size-3.5 shrink-0 text-rose-400" />
}
