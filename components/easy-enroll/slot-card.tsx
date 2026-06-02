"use client"

/**
 * SlotCard — a single document slot in the VerificationDashboard.
 *
 * Features:
 *  - Drop target (HTML5 drag-and-drop, no extra library needed)
 *  - Shows assigned doc preview, name, size, flags
 *  - "Manual Crop" button opens ManualCropModal
 *  - "Remove" button clears the slot
 *  - Draggable assigned doc for moving between slots
 */

import { useState, useCallback } from "react"
import { CheckCircle2, AlertTriangle, XCircle, Crop, Trash2, GripVertical, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSpecByKey } from "@/lib/aktuConfig"
import { formatBytes, getSpec } from "@/lib/aktu"
import { ManualCropModal } from "./manual-crop-modal"
import type { ProcessedDoc } from "./processing-pipeline"

interface Props {
  slotKey: string
  assignedDoc: ProcessedDoc | null
  /** Called when a doc is dropped onto this slot */
  onDrop: (docId: string, targetSlotKey: string) => void
  /** Called when manual crop is confirmed */
  onCropConfirm: (docId: string, blob: Blob, previewUrl: string) => void
  /** Called when slot is cleared */
  onRemove: (docId: string) => void
}

export function SlotCard({ slotKey, assignedDoc, onDrop, onCropConfirm, onRemove }: Props) {
  const spec = getSpecByKey(slotKey)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)

  // ── Drag source (dragging the assigned doc OUT of this slot) ─────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!assignedDoc) return
      e.dataTransfer.setData("docId", assignedDoc.id)
      e.dataTransfer.setData("sourceSlotKey", slotKey)
      e.dataTransfer.effectAllowed = "move"
    },
    [assignedDoc, slotKey],
  )

  // ── Drop target ───────────────────────────────────────────────────────────
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
      if (docId) onDrop(docId, slotKey)
    },
    [onDrop, slotKey],
  )

  // ── Manual crop ───────────────────────────────────────────────────────────
  const handleCropConfirm = useCallback(
    (blob: Blob, previewUrl: string) => {
      if (!assignedDoc) return
      setShowCropModal(false)
      onCropConfirm(assignedDoc.id, blob, previewUrl)
    },
    [assignedDoc, onCropConfirm],
  )

  const isRequired = spec.required
  const isEmpty = !assignedDoc

  return (
    <>
      <div
        className={cn(
          "relative flex flex-col rounded-xl border p-3 transition-all duration-200",
          isEmpty
            ? isDragOver
              ? "border-purple-400 bg-purple-500/15 scale-[1.02]"
              : "border-dashed border-white/15 bg-white/[0.02] hover:border-white/25"
            : assignedDoc?.status === "ok"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : assignedDoc?.status === "flagged"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-rose-500/30 bg-rose-500/5",
          isDragOver && isEmpty && "ring-2 ring-purple-400/50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label={`${spec.label} slot`}
      >
        {/* Slot header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-black text-white">{spec.label}</p>
              {isRequired && (
                <span className="shrink-0 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                  Required
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {spec.category === "document"
                ? `PDF ≤ ${spec.maxKB} KB`
                : `JPG ${(spec as { minKB?: number }).minKB ?? ""}–${spec.maxKB} KB`}
            </p>
          </div>

          {/* Status icon */}
          <StatusIcon doc={assignedDoc} />
        </div>

        {/* Content */}
        {isEmpty ? (
          <div className="mt-3 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-white/[0.015] py-4">
            <FileImage className="size-6 text-slate-600" aria-hidden="true" />
            <p className="text-[10px] text-slate-600">Drop here</p>
          </div>
        ) : (
          <div
            className="mt-2 flex cursor-grab items-start gap-2 active:cursor-grabbing"
            draggable
            onDragStart={handleDragStart}
          >
            <GripVertical className="mt-0.5 size-3 shrink-0 text-slate-600" aria-hidden="true" />

            {/* Preview */}
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assignedDoc.previewUrl}
                alt={`${spec.label} preview`}
                className="size-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-[10px] font-bold text-slate-300">{assignedDoc.file.name}</p>
              <p className="text-[10px] text-slate-500">
                {formatBytes(assignedDoc.size)} · {assignedDoc.confidence}% conf.
              </p>
              {assignedDoc.flags.slice(0, 1).map((f, i) => (
                <p key={i} className="text-[9px] text-amber-300 leading-tight">{f}</p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {assignedDoc && (
          <div className="mt-2 flex gap-1.5">
            {["photo", "signature", "thumb"].includes(assignedDoc.docKey) && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 border-white/10 px-2 text-[10px] font-bold text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
                onClick={() => setShowCropModal(true)}
              >
                <Crop className="size-3" />
                Crop
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
              onClick={() => onRemove(assignedDoc.id)}
              aria-label="Remove from slot"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Manual Crop Modal */}
      {showCropModal && assignedDoc && (
        <ManualCropModal
          imageUrl={assignedDoc.previewUrl}
          docKey={slotKey}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </>
  )
}

function StatusIcon({ doc }: { doc: ProcessedDoc | null }) {
  if (!doc) return null
  if (doc.status === "ok")
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
  if (doc.status === "flagged")
    return <AlertTriangle className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
  return <XCircle className="size-4 shrink-0 text-rose-400" aria-hidden="true" />
}
