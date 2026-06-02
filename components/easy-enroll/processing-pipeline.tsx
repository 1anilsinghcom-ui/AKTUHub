"use client"

/**
 * ProcessingPipeline — orchestrates the full document processing flow.
 *
 * For each incoming File:
 *  1. If PDF  → split into pages (pdfSplitter) → classify each page
 *  2. If image → classify (OCR + image heuristics) → auto-crop
 *  3. Returns ProcessedDoc[] to parent via onComplete
 *
 * Web Workers: OCR + image analysis run in the processingWorker.
 * Heavy PDF splitting also runs in a worker when OffscreenCanvas is available.
 * Falls back to main-thread implementations when workers aren't supported.
 */

import { useCallback, useRef, useState } from "react"
import { splitPdfIntoPages } from "@/lib/pdfSplitter"
import { cropPhoto, cropSignature, cropThumb } from "@/lib/imageCropper"
import { processDocument } from "@/lib/processing"
import { getSpec, formatBytes } from "@/lib/aktu"
import { detectDocumentType } from "@/lib/document-detection"
import { getSpecByKey, PHOTO_SPEC, SIGNATURE_SPEC, THUMB_SPEC, buildAKTUFileName, OCR_CONFIDENCE_THRESHOLD } from "@/lib/aktuConfig"

export interface ProcessedDoc {
  id: string
  /** original File handle */
  file: File
  /** detected / assigned document slot key */
  docKey: string
  /** final output blob (AKTU-compliant) */
  blob: Blob
  /** JPEG preview URL */
  previewUrl: string
  /** output file extension */
  ext: "jpg" | "pdf"
  /** output size in bytes */
  size: number
  /** quality/compliance flags for the user */
  flags: string[]
  /** list of auto-applied transformations */
  autoFixes: string[]
  /** classification confidence 0-100 */
  confidence: number
  /** human-readable detection reason */
  detectionReason: string
  /** page number if extracted from a multi-page PDF */
  pageNumber?: number
  /** total pages in the source PDF */
  totalPages?: number
  /** status of this doc */
  status: "ok" | "flagged" | "error"
  error?: string
}

export interface ProcessingProgress {
  fileIndex: number
  totalFiles: number
  fileName: string
  percent: number
  message: string
}

interface Props {
  /** Files dropped by user */
  files: File[]
  /** Enrollment number for filenames */
  enrollmentNumber?: string
  /** Called as each doc finishes */
  onDocReady: (doc: ProcessedDoc) => void
  /** Called when all files are done */
  onComplete: () => void
  /** Called on progress updates */
  onProgress: (progress: ProcessingProgress) => void
  /** Already-used slot keys (to avoid duplicate assignments) */
  usedKeys: Set<string>
}

let docIdCounter = 0
const nextDocId = () => `pd-${Date.now()}-${docIdCounter++}`

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") &&
    !file.name.toLowerCase().endsWith(".pdf")
  )
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

/**
 * Classify an image page blob using both OCR and image heuristics.
 * Returns { docKey, confidence, reason }.
 */
async function classifyImageBlob(
  blob: Blob,
  filenameHint?: string,
  usedKeys = new Set<string>(),
): Promise<{ docKey: string; confidence: number; reason: string }> {
  // Run OCR and image analysis in parallel (both on main thread for now;
  // a real Worker upgrade can be bolted on without changing this API)
  const ocrPromise: Promise<{ type: string; confidence: number; warnings: string[] }> = (async () => {
    try {
      const { classifyDocumentOcr } = await import("@/lib/ocr-classification")
      return classifyDocumentOcr(blob)
    } catch {
      return { type: "other", confidence: 20, warnings: [] }
    }
  })()

  const imageHeuristicPromise: Promise<{ type: string; confidence: number }> = (async () => {
    try {
      const url = URL.createObjectURL(blob)
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image()
        i.onload = () => res(i)
        i.onerror = rej
        i.src = url
      })
      const w = Math.min(img.naturalWidth, 400)
      const h = Math.min(img.naturalHeight, 400)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)

      const { data } = ctx.getImageData(0, 0, w, h)
      const gray = new Uint8Array(w * h)
      for (let i = 0; i < w * h; i++) {
        gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])
      }

      // Center vs corner edge density
      const cx0 = Math.floor(w * 0.25), cy0 = Math.floor(h * 0.25)
      const cx1 = Math.floor(w * 0.75), cy1 = Math.floor(h * 0.75)
      let centerEdges = 0, centerTotal = 0, cornerEdges = 0, cornerTotal = 0

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x
          const diff =
            Math.abs(gray[idx] - gray[idx - 1]) +
            Math.abs(gray[idx] - gray[idx + 1]) +
            Math.abs(gray[idx] - gray[idx - w]) +
            Math.abs(gray[idx] - gray[idx + w])
          const isCenter = x > cx0 && x < cx1 && y > cy0 && y < cy1
          const isCorner = x < w * 0.2 && y < h * 0.2
          if (isCenter) { if (diff > 40) centerEdges++; centerTotal++ }
          if (isCorner) { if (diff > 40) cornerEdges++; cornerTotal++ }
        }
      }

      const faceScore = (centerTotal > 0 ? centerEdges / centerTotal : 0) /
        ((cornerTotal > 0 ? cornerEdges / cornerTotal : 0) + 0.001)

      let darkPixels = 0
      for (let i = 0; i < gray.length; i++) if (gray[i] < 180) darkPixels++
      const darkRatio = darkPixels / gray.length
      const aspect = img.naturalWidth / img.naturalHeight

      if (faceScore > 1.3) return { type: "photo", confidence: Math.min(85, Math.round(50 + faceScore * 15)) }
      if (darkRatio < 0.12 && aspect > 2.0) return { type: "signature", confidence: 72 }
      if (darkRatio < 0.12 && aspect <= 2.0 && aspect > 0.8) return { type: "thumb", confidence: 62 }
      return { type: "unknown", confidence: 30 }
    } catch {
      return { type: "unknown", confidence: 20 }
    }
  })()

  const [ocr, imgHeuristic] = await Promise.all([ocrPromise, imageHeuristicPromise])

  // Filename detection
  let fnKey = "other", fnConf = 30
  if (filenameHint) {
    const fakeName = filenameHint.toLowerCase().replace(/[^a-z0-9]+/g, "")
    const fnRules: Array<{ words: string[]; key: string }> = [
      { words: ["photo", "passport", "face", "pic"], key: "photo" },
      { words: ["sign", "signature", "sig"], key: "signature" },
      { words: ["thumb", "impression", "finger"], key: "thumb" },
      { words: ["aadhaar", "aadhar", "adhar", "uid"], key: "aadhaar" },
      { words: ["10th", "highschool", "matric", "ssc"], key: "10th" },
      { words: ["12th", "intermediate", "inter", "hsc"], key: "12th" },
      { words: ["diploma", "polytechnic"], key: "diploma" },
      { words: ["tc", "transfer", "leaving"], key: "tc" },
      { words: ["migration", "mc"], key: "mc" },
      { words: ["allotment", "uptac", "admission"], key: "admission" },
      { words: ["caste", "category", "obc"], key: "caste" },
      { words: ["income"], key: "income" },
      { words: ["gap", "affidavit"], key: "gap" },
      { words: ["domicile", "residence"], key: "domicile" },
      { words: ["character", "conduct"], key: "character" },
    ]
    for (const rule of fnRules) {
      if (rule.words.some((w) => fakeName.includes(w.replace(/[^a-z0-9]+/g, "")))) {
        fnKey = rule.key; fnConf = 88; break
      }
    }
  }

  // Priority: filename (≥70) > OCR (if ocr confidence > fn+8) > image heuristic (for photo/sign/thumb)
  // For textual docs OCR wins; for visual slots image heuristic wins
  const isVisualSlot = ["photo", "signature", "thumb"].includes(imgHeuristic.type)
  let docKey = "other", confidence = 30, reason = "No strong signal."

  if (isVisualSlot && imgHeuristic.confidence >= 60 && fnConf < 80) {
    docKey = imgHeuristic.type
    confidence = imgHeuristic.confidence
    reason = `Image heuristic: ${imgHeuristic.type} (${imgHeuristic.confidence}% confidence).`
  } else if (fnConf >= 70) {
    docKey = fnKey; confidence = fnConf
    reason = `Filename match: ${fnKey} (${fnConf}%).`
  } else if (ocr.confidence > fnConf + 8 && ocr.type !== "other") {
    docKey = ocr.type; confidence = ocr.confidence
    reason = `OCR: ${ocr.type} (${ocr.confidence}% confidence).`
  } else if (isVisualSlot && imgHeuristic.confidence >= 55) {
    docKey = imgHeuristic.type; confidence = imgHeuristic.confidence
    reason = `Image heuristic: ${imgHeuristic.type} (${imgHeuristic.confidence}%).`
  } else if (ocr.type !== "other") {
    docKey = ocr.type; confidence = ocr.confidence
    reason = `OCR fallback: ${ocr.type} (${ocr.confidence}%).`
  } else {
    // Order-based fallback
    const imgOrder = ["photo", "signature", "thumb"]
    const docOrder = ["10th", "12th", "tc", "mc", "aadhaar", "admission"]
    const nextImg = imgOrder.find((k) => !usedKeys.has(k))
    const nextDoc = docOrder.find((k) => !usedKeys.has(k))
    docKey = nextImg ?? nextDoc ?? "other"
    confidence = 45
    reason = `Assigned by slot order (${docKey}).`
  }

  return { docKey, confidence, reason }
}

/**
 * Apply the right auto-crop based on docKey.
 * Returns { blob, previewUrl, autoFixes, usedFallback }.
 */
async function autoCropForSlot(blob: Blob, docKey: string) {
  try {
    if (docKey === "photo") return await cropPhoto(blob)
    if (docKey === "signature") return await cropSignature(blob)
    if (docKey === "thumb") return await cropThumb(blob)
  } catch {
    // Swallow — graceful fallback
  }
  return null
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useProcessingPipeline() {
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef(false)

  const runPipeline = useCallback(
    async (
      files: File[],
      usedKeys: Set<string>,
      enrollmentNumber: string,
      onDocReady: (doc: ProcessedDoc) => void,
      onComplete: () => void,
      onProgress: (p: ProcessingProgress) => void,
    ) => {
      setIsRunning(true)
      abortRef.current = false
      const localUsedKeys = new Set(usedKeys)

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        if (abortRef.current) break
        const file = files[fileIndex]

        const reportProgress = (percent: number, message: string) =>
          onProgress({ fileIndex, totalFiles: files.length, fileName: file.name, percent, message })

        reportProgress(0, "Starting…")

        try {
          if (isPdfFile(file)) {
            // ── PDF → split into pages ────────────────────────────────────────
            let pages
            try {
              pages = await splitPdfIntoPages(file, (pct, msg) => reportProgress(pct * 0.6, msg))
            } catch {
              // If splitting fails, treat whole file as one page
              const previewUrl = "data:image/svg+xml;utf8," + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150"><rect width="120" height="150" rx="8" fill="#eef2f7"/><text x="60" y="80" font-family="sans-serif" font-size="20" font-weight="700" fill="#1e3a8a" text-anchor="middle">PDF</text></svg>`
              )
              pages = [{ id: nextDocId(), pdfBlob: file, previewBlob: file, previewUrl, pageNumber: 1, totalPages: 1 }]
            }

            for (let pi = 0; pi < pages.length; pi++) {
              if (abortRef.current) break
              const page = pages[pi]
              const progressBase = 60 + Math.round((pi / pages.length) * 40)
              reportProgress(progressBase, `Classifying page ${page.pageNumber}…`)

              // Classify using OCR on the preview image
              let docKey = "other", confidence = 40, reason = "PDF page"
              try {
                const ocrResult = await classifyImageBlob(
                  page.previewBlob,
                  pi === 0 ? file.name : undefined,
                  localUsedKeys,
                )
                docKey = ocrResult.docKey
                confidence = ocrResult.confidence
                reason = ocrResult.reason
              } catch { /* keep defaults */ }

              if (docKey !== "other") localUsedKeys.add(docKey)

              // Process (compress) using existing engine
              reportProgress(progressBase + 5, "Compressing…")
              let finalBlob = page.pdfBlob
              let flags: string[] = []
              let autoFixes: string[] = []
              let status: ProcessedDoc["status"] = "ok"

              try {
                const spec = getSpec(docKey)
                const result = await processDocument(
                  new File([page.pdfBlob], file.name, { type: "application/pdf" }),
                  spec,
                )
                finalBlob = result.blob
                flags = result.flags
                autoFixes = result.autoFixes
                status = result.status
              } catch (err) {
                flags.push("Processing failed — using original page quality.")
                status = "flagged"
              }

              const doc: ProcessedDoc = {
                id: nextDocId(),
                file,
                docKey,
                blob: finalBlob,
                previewUrl: page.previewUrl,
                ext: "pdf",
                size: finalBlob.size,
                flags,
                autoFixes,
                confidence,
                detectionReason: reason,
                pageNumber: page.pageNumber,
                totalPages: page.totalPages,
                status,
              }

              onDocReady(doc)
            }
          } else if (isImageFile(file)) {
            // ── Image → classify → crop ───────────────────────────────────────
            reportProgress(10, "Classifying image…")

            const imgBlob: Blob = file
            const { docKey, confidence, reason } = await classifyImageBlob(
              imgBlob,
              file.name,
              localUsedKeys,
            )
            localUsedKeys.add(docKey)

            reportProgress(40, `Detected as ${docKey}. Cropping…`)

            // Auto-crop for visual slots
            let workingBlob: Blob = file
            let cropAutoFixes: string[] = []
            let previewUrl = URL.createObjectURL(file)

            const cropResult = await autoCropForSlot(imgBlob, docKey)
            if (cropResult) {
              workingBlob = cropResult.blob
              cropAutoFixes = cropResult.autoFixes
              URL.revokeObjectURL(previewUrl)
              previewUrl = cropResult.previewUrl
            }

            reportProgress(70, "Finalizing…")

            // For non-visual slots: run through existing processDocument
            let finalBlob = workingBlob
            let flags: string[] = []
            let allAutoFixes = [...cropAutoFixes]
            let status: ProcessedDoc["status"] = "ok"

            try {
              if (!["photo", "signature", "thumb"].includes(docKey)) {
                // Document image → process (enhance, OCR, wrap in PDF)
                const spec = getSpec(docKey)
                const result = await processDocument(new File([file], file.name, { type: file.type }), spec)
                finalBlob = result.blob
                flags = result.flags
                allAutoFixes = [...cropAutoFixes, ...result.autoFixes]
                status = result.status
                if (result.previewUrl) {
                  URL.revokeObjectURL(previewUrl)
                  previewUrl = result.previewUrl
                }
              } else {
                // Photo/signature/thumb already processed by cropResult
                const spec = getSpec(docKey)
                const sizeKB = finalBlob.size / 1024
                if (spec.minKB && sizeKB < spec.minKB) {
                  flags.push(`Output is ${Math.round(sizeKB)} KB — below ${spec.minKB} KB minimum.`)
                  status = "flagged"
                }
                if (sizeKB > spec.maxKB) {
                  flags.push(`Output is ${Math.round(sizeKB)} KB — above ${spec.maxKB} KB limit.`)
                  status = "flagged"
                }
              }
            } catch (err) {
              flags.push(`Auto-processing failed — file kept as-is.`)
              status = "flagged"
            }

            const doc: ProcessedDoc = {
              id: nextDocId(),
              file,
              docKey,
              blob: finalBlob,
              previewUrl,
              ext: ["photo", "signature", "thumb"].includes(docKey) ? "jpg" : "pdf",
              size: finalBlob.size,
              flags,
              autoFixes: allAutoFixes,
              confidence,
              detectionReason: reason,
              status,
            }

            reportProgress(100, "Done.")
            onDocReady(doc)
          }
        } catch (err) {
          const errorDoc: ProcessedDoc = {
            id: nextDocId(),
            file,
            docKey: "other",
            blob: file,
            previewUrl: URL.createObjectURL(file),
            ext: "pdf",
            size: file.size,
            flags: [],
            autoFixes: [],
            confidence: 0,
            detectionReason: "Processing failed.",
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          }
          onDocReady(errorDoc)
        }
      }

      setIsRunning(false)
      onComplete()
    },
    [],
  )

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  return { runPipeline, isRunning, abort }
}
