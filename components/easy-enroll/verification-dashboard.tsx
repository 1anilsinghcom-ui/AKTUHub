"use client"

/**
 * VerificationDashboard — teacher-facing review screen.
 *
 * Receives processed documents and presents:
 *  - 9 primary slots (photo, signature, thumb, 10th, 12th, tc, mc, aadhaar, admission)
 *  - Remaining optional slots (folded by default)
 *  - UnclassifiedTray for un-assigned docs
 *
 * Drag-and-drop:
 *  - Drag from Tray → Slot
 *  - Drag from Slot → different Slot (auto-reprocesses if format differs)
 *  - Drag from Slot → Tray (removes assignment)
 *
 * ZIP export button uses aktuConfig buildAKTUFileName for AKTU-compliant naming.
 */

import { useState, useCallback, useMemo } from "react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import {
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { SlotCard } from "./slot-card"
import { UnclassifiedTray } from "./unclassified-tray"
import type { ProcessedDoc } from "./processing-pipeline"
import {
  PRIMARY_SLOTS,
  ALL_SLOT_KEYS,
  buildAKTUFileName,
  buildZipName,
  getSpecByKey,
} from "@/lib/aktuConfig"
import { formatBytes, getSpec } from "@/lib/aktu"
import { cropPhoto, cropSignature, cropThumb } from "@/lib/imageCropper"
import { processDocument } from "@/lib/processing"

interface Props {
  docs: ProcessedDoc[]
  enrollmentNumber: string
  studentName: string
  onDocsChange?: (docs: ProcessedDoc[]) => void
}

// ─── Slot assignment map ──────────────────────────────────────────────────────

type SlotMap = Record<string, string | null>  // slotKey → docId | null

function buildInitialSlotMap(docs: ProcessedDoc[]): SlotMap {
  const map: SlotMap = {}
  for (const key of ALL_SLOT_KEYS) map[key] = null

  // Auto-assign: first doc with matching docKey goes into that slot
  const assigned = new Set<string>()
  for (const key of ALL_SLOT_KEYS) {
    const match = docs.find((d) => d.docKey === key && !assigned.has(d.id))
    if (match) {
      map[key] = match.id
      assigned.add(match.id)
    }
  }
  return map
}

export function VerificationDashboard({
  docs,
  enrollmentNumber,
  studentName,
  onDocsChange,
}: Props) {
  const [slotMap, setSlotMap] = useState<SlotMap>(() => buildInitialSlotMap(docs))
  const [localDocs, setLocalDocs] = useState<ProcessedDoc[]>(docs)
  const [showOptional, setShowOptional] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)

  // Sync when parent pushes new docs
  const mergedDocs = useMemo(() => {
    const idSet = new Set(localDocs.map((d) => d.id))
    const newDocs = docs.filter((d) => !idSet.has(d.id))
    if (newDocs.length === 0) return localDocs
    return [...localDocs, ...newDocs]
  }, [docs, localDocs])

  // Ensure new docs are auto-assigned
  useMemo(() => {
    const newDocs = docs.filter((d) => !localDocs.some((l) => l.id === d.id))
    if (newDocs.length === 0) return
    setLocalDocs((prev) => [...prev, ...newDocs])
    setSlotMap((prev) => {
      const next = { ...prev }
      for (const doc of newDocs) {
        if (next[doc.docKey] === null) next[doc.docKey] = doc.id
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs])

  // ── Unclassified docs ─────────────────────────────────────────────────────
  const assignedDocIds = useMemo(() => new Set(Object.values(slotMap).filter(Boolean) as string[]), [slotMap])

  const unclassifiedDocs = useMemo(
    () => mergedDocs.filter((d) => !assignedDocIds.has(d.id)),
    [mergedDocs, assignedDocIds],
  )

  // ── Slot lookup helper ────────────────────────────────────────────────────
  const getDocForSlot = useCallback(
    (slotKey: string): ProcessedDoc | null => {
      const id = slotMap[slotKey]
      if (!id) return null
      return mergedDocs.find((d) => d.id === id) ?? null
    },
    [slotMap, mergedDocs],
  )

  // ── Drag-and-drop handler ─────────────────────────────────────────────────
  const handleDrop = useCallback(
    async (docId: string, targetSlotKey: string) => {
      if (targetSlotKey === "unassigned") {
        // Move back to tray: remove from whichever slot holds it
        setSlotMap((prev) => {
          const next = { ...prev }
          for (const k of Object.keys(next)) {
            if (next[k] === docId) next[k] = null
          }
          return next
        })
        return
      }

      const doc = mergedDocs.find((d) => d.id === docId)
      if (!doc) return

      const targetSpec = getSpecByKey(targetSlotKey)
      const sourceSpec = getSpecByKey(doc.docKey)

      // Remove doc from its current slot
      setSlotMap((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          if (next[k] === docId) next[k] = null
        }
        // If target slot has a doc, move it to tray (just unassign)
        next[targetSlotKey] = docId
        return next
      })

      // If the target slot requires a different format/category → re-process
      const needsReprocess =
        targetSpec.category !== sourceSpec.category ||
        targetSpec.ext !== sourceSpec.ext

      if (needsReprocess) {
        setReprocessingId(docId)
        try {
          let newBlob = doc.blob
          let newPreviewUrl = doc.previewUrl
          let newAutoFixes = [...doc.autoFixes]

          if (targetSpec.category === "photo") {
            const result = await cropPhoto(doc.blob instanceof File ? doc.blob : new File([doc.blob], doc.file.name, { type: "image/jpeg" }))
            newBlob = result.blob
            newPreviewUrl = result.previewUrl
            newAutoFixes = [...newAutoFixes, ...result.autoFixes]
          } else if (targetSpec.category === "signature") {
            const result = await cropSignature(doc.blob instanceof File ? doc.blob : new File([doc.blob], doc.file.name, { type: "image/jpeg" }))
            newBlob = result.blob
            newPreviewUrl = result.previewUrl
            newAutoFixes = [...newAutoFixes, ...result.autoFixes]
          } else if (targetSpec.category === "thumb") {
            const result = await cropThumb(doc.blob instanceof File ? doc.blob : new File([doc.blob], doc.file.name, { type: "image/jpeg" }))
            newBlob = result.blob
            newPreviewUrl = result.previewUrl
            newAutoFixes = [...newAutoFixes, ...result.autoFixes]
          } else if (targetSpec.category === "document") {
            try {
              const srcFile = new File([doc.file], doc.file.name, { type: doc.file.type || "application/pdf" })
              const result = await processDocument(srcFile, getSpec(targetSlotKey))
              newBlob = result.blob
              if (result.previewUrl) newPreviewUrl = result.previewUrl
              newAutoFixes = [...newAutoFixes, ...result.autoFixes]
            } catch { /* keep original */ }
          }

          setLocalDocs((prev) =>
            prev.map((d) =>
              d.id === docId
                ? { ...d, blob: newBlob, previewUrl: newPreviewUrl, docKey: targetSlotKey, autoFixes: newAutoFixes }
                : d,
            ),
          )
        } catch {
          toast.error("Re-processing failed — file kept as original.")
        } finally {
          setReprocessingId(null)
        }
      } else {
        // Just update docKey to match slot
        setLocalDocs((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, docKey: targetSlotKey } : d)),
        )
      }
    },
    [mergedDocs],
  )

  // ── Manual crop confirm ───────────────────────────────────────────────────
  const handleCropConfirm = useCallback((docId: string, blob: Blob, previewUrl: string) => {
    setLocalDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              blob,
              previewUrl,
              size: blob.size,
              autoFixes: [...d.autoFixes, "Manual crop applied."],
              status: "ok" as const,
              flags: [],
            }
          : d,
      ),
    )
    toast.success("Manual crop applied.")
  }, [])

  // ── Remove from slot ──────────────────────────────────────────────────────
  const handleRemove = useCallback((docId: string) => {
    setSlotMap((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next)) {
        if (next[k] === docId) next[k] = null
      }
      return next
    })
  }, [])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const requiredSlots = ALL_SLOT_KEYS.filter((k) => getSpecByKey(k).required)
    const filled = requiredSlots.filter((k) => slotMap[k] !== null)
    const okDocs = mergedDocs.filter((d) => assignedDocIds.has(d.id) && d.status === "ok")
    const flaggedDocs = mergedDocs.filter((d) => assignedDocIds.has(d.id) && d.status === "flagged")
    return {
      requiredFilled: filled.length,
      requiredTotal: requiredSlots.length,
      ok: okDocs.length,
      flagged: flaggedDocs.length,
      pct: Math.round((filled.length / requiredSlots.length) * 100),
    }
  }, [slotMap, mergedDocs, assignedDocIds])

  // ── Download ZIP ──────────────────────────────────────────────────────────
  const handleDownloadZip = useCallback(async () => {
    const toDownload = ALL_SLOT_KEYS
      .map((k) => ({ slotKey: k, doc: getDocForSlot(k) }))
      .filter((entry) => entry.doc !== null) as Array<{ slotKey: string; doc: ProcessedDoc }>

    if (toDownload.length === 0) {
      toast.error("No documents assigned to slots yet.")
      return
    }

    setDownloading(true)
    try {
      const zip = new JSZip()
      const lines: string[] = [
        "AKTU Enrollment Package",
        "=======================",
        `Roll/Enrollment: ${enrollmentNumber || "STUDENT"}`,
        `Name: ${studentName || "(not provided)"}`,
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        "",
        "Files:",
      ]

      for (const { slotKey, doc } of toDownload) {
        const spec = getSpecByKey(slotKey)
        const fileName = buildAKTUFileName(enrollmentNumber, slotKey, spec.ext)
        zip.file(fileName, doc.blob)
        lines.push(
          `  ${fileName}  (${formatBytes(doc.size)})${doc.flags.length ? " [⚠ review]" : " [✓]"}`,
        )
        if (doc.autoFixes.length) {
          lines.push(`    Auto: ${doc.autoFixes.join("; ")}`)
        }
      }

      // Note missing required slots
      const missingRequired = ALL_SLOT_KEYS.filter(
        (k) => getSpecByKey(k).required && slotMap[k] === null,
      )
      if (missingRequired.length) {
        lines.push("")
        lines.push("Missing required documents:")
        for (const k of missingRequired) lines.push(`  - ${getSpecByKey(k).label}`)
      }

      zip.file("summary.txt", lines.join("\n"))

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })

      const zipName = buildZipName(enrollmentNumber, studentName)
      saveAs(blob, zipName)
      toast.success(`Downloaded ${zipName} (${toDownload.length} files)`)
    } catch (err) {
      toast.error("ZIP generation failed.")
      console.error("[VerificationDashboard] ZIP error:", err)
    } finally {
      setDownloading(false)
    }
  }, [getDocForSlot, enrollmentNumber, studentName, slotMap])

  const optionalSlotKeys = ALL_SLOT_KEYS.filter((k) => !PRIMARY_SLOTS.includes(k))

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-white">{stats.pct}%</span>
        </div>
        <span className="text-xs text-slate-400">
          {stats.requiredFilled}/{stats.requiredTotal} required
        </span>
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle2 className="size-3" /> {stats.ok} ready
        </span>
        {stats.flagged > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <AlertTriangle className="size-3" /> {stats.flagged} need review
          </span>
        )}
        <Button
          className="ml-auto h-8 gap-2 bg-purple-600 text-xs font-bold hover:bg-purple-700 text-white"
          onClick={handleDownloadZip}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Download ZIP
        </Button>
      </div>

      {/* Primary slots — 3-column grid */}
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
          Primary Slots
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY_SLOTS.map((key) => (
            <div key={key} className="relative">
              {reprocessingId === slotMap[key] && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                  <Loader2 className="size-5 animate-spin text-purple-400" />
                </div>
              )}
              <SlotCard
                slotKey={key}
                assignedDoc={getDocForSlot(key)}
                onDrop={handleDrop}
                onCropConfirm={handleCropConfirm}
                onRemove={handleRemove}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Optional slots (collapsible) */}
      <div>
        <button
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
          onClick={() => setShowOptional((v) => !v)}
        >
          {showOptional ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Optional Slots ({optionalSlotKeys.length})
        </button>
        {showOptional && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optionalSlotKeys.map((key) => (
              <div key={key} className="relative">
                {reprocessingId === slotMap[key] && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                    <Loader2 className="size-5 animate-spin text-purple-400" />
                  </div>
                )}
                <SlotCard
                  slotKey={key}
                  assignedDoc={getDocForSlot(key)}
                  onDrop={handleDrop}
                  onCropConfirm={handleCropConfirm}
                  onRemove={handleRemove}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unclassified tray */}
      <UnclassifiedTray docs={unclassifiedDocs} onDrop={handleDrop} />
    </div>
  )
}
