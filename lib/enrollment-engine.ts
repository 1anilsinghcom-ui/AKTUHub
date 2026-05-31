import { DOC_SPECS, getSpec, type DocCategory } from "./aktu"
import type { DocItem, DocItemStatus } from "@/components/easy-enroll/types"
import { detectDocumentType, type DetectionResult } from "./document-detection"

export type { DetectionResult }
export { detectDocumentType }

export interface ReadinessScores {
  photo: number
  signature: number
  thumb: number
  documents: number
  overall: number
  status: "Ready" | "Needs Review" | "Action Required"
}

export interface EngineStats {
  totalFiles: number
  readyFiles: number
  warningFiles: number
  failedFiles: number
  pendingFiles: number
  requiredComplete: number
  requiredTotal: number
}


export function getEngineStats(items: DocItem[]): EngineStats {
  const requiredSpecs = DOC_SPECS.filter((s) => s.required)
  const processedKeys = new Set(
    items.filter((item) => item.status === "ok" || item.status === "flagged").map((item) => item.docKey),
  )

  return {
    totalFiles: items.length,
    readyFiles: items.filter((item) => item.status === "ok").length,
    warningFiles: items.filter((item) => item.status === "flagged").length,
    failedFiles: items.filter((item) => item.status === "error").length,
    pendingFiles: items.filter((item) => item.status === "queued" || item.status === "processing").length,
    requiredComplete: requiredSpecs.filter((spec) => processedKeys.has(spec.key)).length,
    requiredTotal: requiredSpecs.length,
  }
}

export function getReadinessScores(items: DocItem[]): ReadinessScores {
  const scoreForCategory = (category: DocCategory) => {
    const categoryItems = items.filter((item) => getSpec(item.docKey).category === category)
    if (!categoryItems.length) return category === "thumb" ? 100 : 0
    const total = categoryItems.reduce((sum, item) => sum + scoreItem(item), 0)
    return Math.round(total / categoryItems.length)
  }

  const photo = scoreForCategory("photo")
  const signature = scoreForCategory("signature")
  const thumb = scoreForCategory("thumb")
  const documents = scoreForCategory("document")
  const stats = getEngineStats(items)
  const completeness = stats.requiredTotal
    ? Math.round((stats.requiredComplete / stats.requiredTotal) * 100)
    : 100
  const overall = Math.round(photo * 0.2 + signature * 0.15 + thumb * 0.1 + documents * 0.35 + completeness * 0.2)

  return {
    photo,
    signature,
    thumb,
    documents,
    overall,
    status: stats.failedFiles > 0 || overall < 70 ? "Action Required" : overall < 95 ? "Needs Review" : "Ready",
  }
}

/** Only per-file processing failures block that file — not missing docs or profile fields. */
export function getCriticalIssues(items: DocItem[]): string[] {
  return items
    .filter((item) => item.status === "error")
    .map((item) => `${getSpec(item.docKey).label}: ${item.error ?? "Processing failed."}`)
}

export function getDownloadableItems(items: DocItem[]): DocItem[] {
  return items.filter((item) => (item.status === "ok" || item.status === "flagged") && item.result)
}

export function getPipelineStep(status: DocItemStatus) {
  if (status === "queued") return 1
  if (status === "processing") return 3
  if (status === "ok" || status === "flagged") return 6
  return 5
}

export function explainItem(item: DocItem) {
  const spec = getSpec(item.docKey)
  const flags = item.result?.flags ?? []
  const autoFixes = item.result?.autoFixes ?? []
  const autoFixText =
    autoFixes.length > 0
      ? autoFixes.join(" ")
      : "Format conversion, compression, cleanup, or PDF wrapping was applied where needed."

  if (item.status === "ok") {
    return {
      problem: "No blocking issue detected.",
      reason: `${spec.label} matches the current format and size rules.`,
      autoFix: autoFixText,
      action: "Ready to download.",
    }
  }
  if (item.status === "flagged") {
    return {
      problem: flags[0] ?? "Needs review.",
      reason: "The file was processed, but one or more quality checks need review.",
      autoFix: autoFixText,
      action: "You can still download — review warnings if needed.",
    }
  }
  if (item.status === "error") {
    return {
      problem: item.error ?? "Processing failed.",
      reason: flags[0] ?? "This file could not be processed safely.",
      autoFix: autoFixes.length ? autoFixes.join(" ") : "No safe automatic fix was possible.",
      action: "Replace this file or select the correct document type.",
    }
  }
  return {
    problem: "Processing is in progress.",
    reason: "The engine is cropping, enhancing, validating, and optimizing this file.",
    autoFix: "Auto-fixes will be applied when safe.",
    action: "Wait for processing to finish.",
  }
}

function scoreItem(item: DocItem) {
  if (item.status === "ok") return 100
  if (item.status === "flagged") return Math.max(60, 92 - (item.result?.flags.length ?? 1) * 10)
  if (item.status === "processing" || item.status === "queued") return 45
  return 0
}
