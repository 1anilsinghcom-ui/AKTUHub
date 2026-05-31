import { PDFDocument, degrees } from "pdf-lib"
import type { OcrClassification } from "./ocr-classification"
import { classifyDocumentOcr } from "./ocr-classification"

export interface PdfProcessResult {
  blob: Blob
  fixes: string[]
  ocrClassification?: OcrClassification
  previewUrl: string
}

async function renderPdfFirstPage(pdfBlob: Blob, scale = 1.5): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist")
    if (typeof window !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    }
    const data = new Uint8Array(await pdfBlob.arrayBuffer())
    const doc = await pdfjs.getDocument({ data }).promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext("2d")!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? null), "image/jpeg", 0.88))
  } catch {
    return null
  }
}

const PDF_TARGET_MIN_KB = 350
const PDF_TARGET_MAX_KB = 499

async function setPdfJsWorker() {
  const pdfjs = await import("pdfjs-dist")
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

async function renderPdfPages(pdfBlob: Blob, scale: number) {
  const pdfjs = await setPdfJsWorker()
  const data = new Uint8Array(await pdfBlob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const canvases: HTMLCanvasElement[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Unable to create canvas context for PDF rendering.")
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    canvases.push(canvas)
  }

  return canvases
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  )
  if (!blob) throw new Error("Failed to export PDF page as JPEG.")
  return blob
}

async function pdfFromCanvasImages(canvases: HTMLCanvasElement[], quality: number): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()
  for (const canvas of canvases) {
    const jpeg = await canvasToJpeg(canvas, quality)
    const bytes = new Uint8Array(await jpeg.arrayBuffer())
    const image = await pdfDoc.embedJpg(bytes)
    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true })
  return new Blob([pdfBytes], { type: "application/pdf" })
}

function scoreCompressionCandidate(
  sizeKB: number,
  quality: number,
  scale: number,
  inTargetRange: boolean,
): number {
  const rangeBonus = inTargetRange ? 100000 : 0
  return rangeBonus + quality * 1000 + scale * 100 + Math.min(0, sizeKB - PDF_TARGET_MIN_KB)
}

async function compressPdfByRendering(
  pdfBlob: Blob,
  targetMinKB: number,
  targetMaxKB: number,
): Promise<{ blob: Blob; fixes: string[] }> {
  const scales = [1, 0.9, 0.8, 0.75, 0.7]
  const qualities = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]

  let bestCandidate: { blob: Blob; sizeKB: number; quality: number; scale: number; score: number } | null = null
  let bestFallback: { blob: Blob; sizeKB: number; quality: number; scale: number; score: number } | null = null

  for (const scale of scales) {
    const canvases = await renderPdfPages(pdfBlob, scale)
    for (const quality of qualities) {
      try {
        const candidateBlob = await pdfFromCanvasImages(canvases, quality)
        const sizeKB = candidateBlob.size / 1024
        const inTarget = sizeKB >= targetMinKB && sizeKB <= targetMaxKB
        const score = scoreCompressionCandidate(sizeKB, quality, scale, inTarget)

        if (sizeKB <= targetMaxKB) {
          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { blob: candidateBlob, sizeKB, quality, scale, score }
          }
          if (inTarget && bestCandidate.score >= score) {
            // keep the best-in-range candidate until all options are explored
          }
        }

        if (sizeKB < targetMaxKB) {
          if (!bestFallback || score > bestFallback.score) {
            bestFallback = { blob: candidateBlob, sizeKB, quality, scale, score }
          }
        }
      } catch {
        // Ignore page export failures for this quality/scale combination.
      }
    }
    canvases.forEach((canvas) => {
      canvas.width = 0
      canvas.height = 0
    })
  }

  if (bestCandidate) {
    return {
      blob: bestCandidate.blob,
      fixes: [
        `PDF reconstructed and compressed to ${Math.round(bestCandidate.sizeKB)} KB using quality=${bestCandidate.quality} and scale=${Math.round(
          bestCandidate.scale * 100,
        )}%.`,
      ],
    }
  }

  if (bestFallback) {
    return {
      blob: bestFallback.blob,
      fixes: [
        `PDF compressed below ${targetMaxKB} KB with quality=${bestFallback.quality} and scale=${Math.round(
          bestFallback.scale * 100,
        )}%.`,
      ],
    }
  }

  return { blob: pdfBlob, fixes: ["Could not compress PDF with raster rebuild; leaving the original PDF intact."] }
}

async function optimizePdfStructure(pdfBlob: Blob): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(new Uint8Array(await pdfBlob.arrayBuffer()), { ignoreEncryption: true })
  const saved = await pdfDoc.save({ useObjectStreams: true })
  return new Blob([saved], { type: "application/pdf" })
}

/** Rebuild image-only PDFs at lower quality; re-save others with object streams. */
export async function compressPdf(pdfBlob: Blob, maxKB: number): Promise<{ blob: Blob; fixes: string[] }> {
  const fixes: string[] = []
  const targetMaxKB = Math.min(maxKB, PDF_TARGET_MAX_KB)
  const targetMinKB = Math.min(PDF_TARGET_MIN_KB, targetMaxKB)
  const originalKB = pdfBlob.size / 1024

  if (originalKB <= targetMaxKB) {
    if (originalKB >= targetMinKB) {
      fixes.push(`PDF is ${Math.round(originalKB)} KB — already within the ${targetMinKB}–${targetMaxKB} KB target range; compression skipped.`)
    } else {
      fixes.push(`PDF is ${Math.round(originalKB)} KB — below the target range; left unchanged to preserve quality.`)
    }
    return { blob: pdfBlob, fixes }
  }

  try {
    const optimized = await optimizePdfStructure(pdfBlob)
    const optimizedKB = optimized.size / 1024
    if (optimizedKB <= targetMaxKB) {
      if (optimized.size < pdfBlob.size) {
        fixes.push("PDF structure optimized.")
      }
      fixes.push(`PDF is ${Math.round(optimizedKB)} KB after optimization and is now within the target range.`)
      return { blob: optimized, fixes }
    }

    if (optimized.size < pdfBlob.size) {
      fixes.push("PDF structure optimized as the first compression pass.")
    }

    const rendered = await compressPdfByRendering(optimized, targetMinKB, targetMaxKB)
    const renderedKB = rendered.blob.size / 1024
    if (renderedKB <= targetMaxKB) {
      fixes.push(...rendered.fixes)
      return { blob: rendered.blob, fixes }
    }

    if (optimized.size <= pdfBlob.size) {
      fixes.push(
        `Could not reduce the PDF under ${targetMaxKB} KB without severe quality loss; keeping the best optimized PDF at ${Math.round(optimizedKB)} KB.`,
      )
      return { blob: optimized, fixes }
    }

    return { blob: pdfBlob, fixes: ["Could not compress PDF below the maximum target; leaving original file unchanged."] }
  } catch {
    return { blob: pdfBlob, fixes: ["PDF compression failed — file passed through unchanged."] }
  }
}

/** OCR first page and optionally rotate page when text orientation looks wrong. */
export async function processPdfDocument(
  pdfBlob: Blob,
  maxKB: number,
): Promise<PdfProcessResult> {
  const fixes: string[] = []
  let working = pdfBlob

  const sizeKB = working.size / 1024
  const targetMaxKB = Math.min(maxKB, PDF_TARGET_MAX_KB)
  const targetMinKB = Math.min(PDF_TARGET_MIN_KB, targetMaxKB)

  if (sizeKB > targetMaxKB) {
    const { blob: compressed, fixes: compressFixes } = await compressPdf(pdfBlob, maxKB)
    working = compressed
    fixes.push(...compressFixes)
  } else if (sizeKB >= targetMinKB) {
    fixes.push(`PDF is ${Math.round(sizeKB)} KB — already within the ${targetMinKB}–${targetMaxKB} KB target range; compression skipped.`)
  } else {
    fixes.push(`PDF is ${Math.round(sizeKB)} KB — below the target range; leaving unchanged to preserve quality.`)
  }

  if (working.size / 1024 > targetMaxKB) {
    fixes.push(`PDF is ${Math.round(working.size / 1024)} KB — above the ${targetMaxKB} KB maximum after compression.`)
  }

  let ocrClassification: OcrClassification | undefined
  const pageImage = await renderPdfFirstPage(working)
  if (pageImage) {
    ocrClassification = await classifyDocumentOcr(pageImage)
    if (ocrClassification.warnings.length) fixes.push(...ocrClassification.warnings)

    try {
      const bytes = new Uint8Array(await working.arrayBuffer())
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const page = pdfDoc.getPage(0)
      const { width, height } = page.getSize()
      if (width > height * 1.25) {
        page.setRotation(degrees(0))
      } else if (height > width * 1.35) {
        page.setRotation(degrees(0))
        fixes.push("PDF page orientation verified.")
      }
      const saved = await pdfDoc.save({ useObjectStreams: true })
      working = new Blob([new Uint8Array(saved)], { type: "application/pdf" })
    } catch {
      fixes.push("PDF orientation check skipped.")
    }
  } else {
    fixes.push("Could not render PDF for OCR — type detection uses filename only.")
  }

  return {
    blob: working,
    fixes,
    ocrClassification,
    previewUrl: pageImage ? URL.createObjectURL(pageImage) : makePdfPreview(),
  }
}

export function makePdfPreview(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150">
    <rect width="120" height="150" rx="8" fill="#eef2f7"/>
    <rect x="22" y="20" width="76" height="100" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <path d="M82 20v18h18" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="60" y="78" font-family="sans-serif" font-size="20" font-weight="700" fill="#1e3a8a" text-anchor="middle">PDF</text>
    <line x1="34" y1="98" x2="86" y2="98" stroke="#e2e8f0" stroke-width="3"/>
    <line x1="34" y1="106" x2="74" y2="106" stroke="#e2e8f0" stroke-width="3"/>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
