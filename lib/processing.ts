import imageCompression from "browser-image-compression"
import { PDFDocument } from "pdf-lib"
import type { DocSpec } from "./aktu"
import {
  autoCropImage,
  autoRotateImage,
  cropWhitespace,
  enhanceDocument,
  faceCheck,
  loadImageElement,
} from "./image-utils"
import { classifyDocumentOcr, mergeOcrWithFilename, type OcrClassification } from "./ocr-classification"
import { makePdfPreview, processPdfDocument } from "./pdf-utils"
import { detectDocumentType } from "./document-detection"

export type ProcessStatus = "ok" | "flagged" | "error"

export interface ProcessResult {
  blob: Blob
  size: number
  ext: "jpg" | "pdf"
  status: ProcessStatus
  flags: string[]
  autoFixes: string[]
  ocrClassification?: OcrClassification
  suggestedDocKey?: string
  /** object URL for a visual preview (always an image, even for PDFs) */
  previewUrl: string
}

const BLUR_THRESHOLD = 45

/**
 * Estimate image sharpness using the variance of the Laplacian.
 * Higher variance = sharper image. Runs on a downscaled grayscale copy.
 */
async function laplacianVariance(file: Blob): Promise<number> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(url)
    const maxDim = 400
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return BLUR_THRESHOLD + 1
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)

    const gray = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
    }

    let sum = 0
    let sumSq = 0
    let count = 0
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x
        const lap =
          gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w] - 4 * gray[idx]
        sum += lap
        sumSq += lap * lap
        count++
      }
    }
    if (count === 0) return BLUR_THRESHOLD + 1
    const mean = sum / count
    return sumSq / count - mean * mean
  } catch {
    return BLUR_THRESHOLD + 1
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Convert an image blob to grayscale with boosted contrast (for signatures). */
async function cleanSignature(file: Blob): Promise<{ blob: Blob; fixes: string[] }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(url)
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return { blob: file, fixes: [] }
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data
    const contrast = 1.4
    for (let i = 0; i < d.length; i += 4) {
      let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      v = (v - 128) * contrast + 128
      v = Math.max(0, Math.min(255, v))
      d[i] = d[i + 1] = d[i + 2] = v
    }
    ctx.putImageData(imageData, 0, 0)
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.92),
    )
    return { blob, fixes: ["Cleaned signature/thumb with contrast boost."] }
  } catch {
    return { blob: file, fixes: ["Signature cleanup skipped."] }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Iteratively compress an image to a JPEG under maxKB. */
async function compressToTarget(
  file: Blob,
  maxKB: number,
  maxWidthOrHeight: number,
): Promise<Blob> {
  const asFile =
    file instanceof File ? file : new File([file], "input", { type: file.type || "image/jpeg" })
  return imageCompression(asFile, {
    maxSizeMB: maxKB / 1024,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
    alwaysKeepResolution: false,
  })
}

async function jpegToPdf(jpeg: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await jpeg.arrayBuffer())
  const pdfDoc = await PDFDocument.create()
  const image = await pdfDoc.embedJpg(bytes)
  const page = pdfDoc.addPage([image.width, image.height])
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  const pdfBytes = await pdfDoc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" })
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

/**
 * Process a single document according to its AKTU spec.
 * All image work happens in the browser.
 */
export async function processDocument(file: File, spec: DocSpec): Promise<ProcessResult> {
  const flags: string[] = []
  const autoFixes: string[] = []

  // ---- Document types (marksheets, certificates, Aadhaar, etc.) ----
  if (spec.category === "document") {
    if (isPdf(file)) {
      const pdfResult = await processPdfDocument(file, spec.maxKB)
      autoFixes.push(...pdfResult.fixes)

      const filenameDetection = detectDocumentType(file)
      let ocrClassification = pdfResult.ocrClassification
      let suggestedDocKey: string | undefined

      if (ocrClassification) {
        const merged = mergeOcrWithFilename(
          filenameDetection.docKey,
          filenameDetection.confidence,
          ocrClassification,
        )
        suggestedDocKey = merged.docKey
        ocrClassification = { ...ocrClassification, type: merged.docKey, confidence: merged.confidence }
      } else {
        suggestedDocKey = filenameDetection.docKey
      }

      const sizeKB = pdfResult.blob.size / 1024
      if (sizeKB > spec.maxKB) {
        flags.push(
          `PDF is ${Math.round(sizeKB)} KB — above the ${spec.maxKB} KB limit. Try scanning at a lower DPI (150–200).`,
        )
      }

      return {
        blob: pdfResult.blob,
        size: pdfResult.blob.size,
        ext: "pdf",
        status: flags.length ? "flagged" : "ok",
        flags,
        autoFixes,
        ocrClassification,
        suggestedDocKey,
        previewUrl: pdfResult.previewUrl,
      }
    }

    // Image document: crop → rotate → enhance → compress → OCR → PDF
    let working: Blob = file

    const cropped = await autoCropImage(working)
    working = cropped.blob
    autoFixes.push(...cropped.fixes)

    const rotated = await autoRotateImage(working)
    working = rotated.blob
    autoFixes.push(...rotated.fixes)

    const enhanced = await enhanceDocument(working)
    working = enhanced.blob
    autoFixes.push(...enhanced.fixes)

    const ocrSource = working
    const ocrClassification = await classifyDocumentOcr(ocrSource)
    if (ocrClassification.warnings.length) flags.push(...ocrClassification.warnings)

    const filenameDetection = detectDocumentType(file)
    const merged = mergeOcrWithFilename(
      filenameDetection.docKey,
      filenameDetection.confidence,
      ocrClassification,
    )
    const suggestedDocKey = merged.docKey

    const compressed = await compressToTarget(working, spec.maxKB, 1654)
    autoFixes.push(`Compressed to target size (≤ ${spec.maxKB} KB).`)
    const previewUrl = URL.createObjectURL(compressed)
    const pdf = await jpegToPdf(compressed)
    autoFixes.push("Wrapped processed image into PDF.")

    if (pdf.size / 1024 > spec.maxKB) {
      flags.push(`Converted PDF is ${Math.round(pdf.size / 1024)} KB — slightly above target.`)
    }

    return {
      blob: pdf,
      size: pdf.size,
      ext: "pdf",
      status: flags.length ? "flagged" : "ok",
      flags,
      autoFixes,
      ocrClassification: { ...ocrClassification, type: merged.docKey, confidence: merged.confidence },
      suggestedDocKey,
      previewUrl,
    }
  }

  // ---- Photo / Signature (images) ----
  if (isPdf(file)) {
    return {
      blob: file,
      size: file.size,
      ext: "jpg",
      status: "error",
      flags: ["A PDF was uploaded for an image slot. Please upload a JPG/PNG image."],
      autoFixes: [],
      previewUrl: makePdfPreview(),
    }
  }

  const variance = await laplacianVariance(file)
  if (variance < BLUR_THRESHOLD) {
    flags.push("Photo dhundhli hai / Image looks blurry. Please re-upload a sharper scan.")
  }

  if (spec.category === "photo") {
    const face = await faceCheck(file)
    if (!face.ok && face.warning) flags.push(face.warning)
  }

  let working: Blob = file
  if (spec.category === "signature" || spec.category === "thumb") {
    const cleaned = await cleanSignature(file)
    working = cleaned.blob
    autoFixes.push(...cleaned.fixes)
    const cropped = await cropWhitespace(working)
    working = cropped.blob
    autoFixes.push(...cropped.fixes)
  }

  const maxDim = spec.category === "photo" ? 600 : 900
  const compressed = await compressToTarget(working, spec.maxKB, maxDim)
  autoFixes.push(`Compressed to ${spec.maxKB} KB target.`)
  const sizeKB = compressed.size / 1024

  if (spec.minKB && sizeKB < spec.minKB) {
    flags.push(
      `Output is ${Math.round(sizeKB)} KB — below the ${spec.minKB} KB minimum. Use a higher-resolution original for best quality.`,
    )
  }
  if (sizeKB > spec.maxKB) {
    flags.push(`Output is ${Math.round(sizeKB)} KB — above the ${spec.maxKB} KB limit.`)
  }

  return {
    blob: compressed,
    size: compressed.size,
    ext: "jpg",
    status: flags.length ? "flagged" : "ok",
    flags,
    autoFixes,
    previewUrl: URL.createObjectURL(compressed),
  }
}

export { makePdfPreview }
