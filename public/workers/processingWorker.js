/**
 * processingWorker.js — Web Worker for heavy document processing tasks.
 *
 * Handles:
 *  - PDF page splitting (pdfjs-dist + pdf-lib)
 *  - OCR classification (Tesseract.js)
 *  - Image heuristics (contour-like analysis via canvas pixel ops)
 *
 * Message protocol:
 *  Incoming:  { type, id, payload }
 *  Outgoing:  { type, id, result?, error?, progress? }
 */

/* eslint-disable no-restricted-globals */

// ─── Message dispatcher ───────────────────────────────────────────────────────

self.onmessage = async (event) => {
  const { type, id, payload } = event.data

  try {
    switch (type) {
      case "SPLIT_PDF":
        await handleSplitPdf(id, payload)
        break
      case "OCR_CLASSIFY":
        await handleOcrClassify(id, payload)
        break
      case "ANALYZE_IMAGE":
        await handleAnalyzeImage(id, payload)
        break
      default:
        self.postMessage({ type: "ERROR", id, error: `Unknown task type: ${type}` })
    }
  } catch (err) {
    self.postMessage({ type: "ERROR", id, error: err?.message ?? String(err) })
  }
}

// ─── PDF Page Splitting ───────────────────────────────────────────────────────

async function handleSplitPdf(id, { pdfBuffer }) {
  self.postMessage({ type: "PROGRESS", id, progress: 5, message: "Loading PDF…" })

  // Dynamic imports inside worker
  const [pdfjsModule, pdfLibModule] = await Promise.all([
    import("https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.mjs"),
    import("https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js"),
  ])

  const pdfjs = pdfjsModule
  pdfjs.GlobalWorkerOptions.workerSrc = ""  // main-thread rendering inside worker is fine

  const data = new Uint8Array(pdfBuffer)
  const loadingTask = pdfjs.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const totalPages = pdfDoc.numPages

  self.postMessage({ type: "PROGRESS", id, progress: 15, message: `PDF has ${totalPages} page(s). Splitting…` })

  // Load with pdf-lib for single-page extraction
  const { PDFDocument } = pdfLibModule
  const srcPdfDoc = await PDFDocument.load(data)

  const pages = []

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageNumber = pageIndex + 1
    const progressPct = 15 + Math.round((pageIndex / totalPages) * 75)

    self.postMessage({
      type: "PROGRESS",
      id,
      progress: progressPct,
      message: `Processing page ${pageNumber} of ${totalPages}…`,
    })

    // ── Render to canvas for JPEG preview ──────────────────────────────────
    const pdfPage = await pdfDoc.getPage(pageNumber)
    const viewport = pdfPage.getViewport({ scale: 1.5 })
    const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height))
    const ctx = canvas.getContext("2d")
    await pdfPage.render({ canvasContext: ctx, viewport }).promise

    const previewBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 })

    // ── Extract single-page PDF via pdf-lib ─────────────────────────────────
    const singlePageDoc = await PDFDocument.create()
    const [copiedPage] = await singlePageDoc.copyPages(srcPdfDoc, [pageIndex])
    singlePageDoc.addPage(copiedPage)
    const pdfBytes = await singlePageDoc.save()
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" })

    // Transfer blobs as ArrayBuffers (structured clone)
    const previewBuffer = await previewBlob.arrayBuffer()
    const pdfBuffer2 = await pdfBlob.arrayBuffer()

    pages.push({ pageNumber, previewBuffer, pdfBuffer: pdfBuffer2 })
  }

  self.postMessage(
    {
      type: "SPLIT_PDF_DONE",
      id,
      result: { pages, totalPages },
    },
    pages.map((p) => p.previewBuffer).concat(pages.map((p) => p.pdfBuffer)),
  )
}

// ─── OCR Classification ───────────────────────────────────────────────────────

let tesseractWorker = null

async function getTesseractWorker() {
  if (tesseractWorker) return tesseractWorker

  // Tesseract v4 / v5 CDN import
  const { createWorker } = await import(
    "https://unpkg.com/tesseract.js@5.0.5/src/index.mjs"
  )
  tesseractWorker = await createWorker("eng", 1, { logger: () => {} })
  return tesseractWorker
}

const OCR_RULES = [
  { key: "aadhaar", patterns: [/aadhaar/i, /aadhar/i, /uidai/i, /unique identification/i, /\b\d{4}\s?\d{4}\s?\d{4}\b/] },
  { key: "10th", patterns: [/high school/i, /secondary school/i, /class\s*x\b/i, /10th/i, /matric/i, /ssc/i] },
  { key: "12th", patterns: [/intermediate/i, /higher secondary/i, /class\s*xii\b/i, /12th/i, /hsc/i] },
  { key: "tc", patterns: [/transfer certificate/i, /school leaving/i, /\btc\b/i] },
  { key: "mc", patterns: [/migration certificate/i, /migration/i] },
  { key: "admission", patterns: [/allotment/i, /uptac/i, /seat allotment/i, /admission letter/i] },
  { key: "diploma", patterns: [/diploma/i, /polytechnic/i] },
  { key: "income", patterns: [/income certificate/i, /annual income/i] },
  { key: "caste", patterns: [/caste certificate/i, /\bobc\b/i, /category certificate/i] },
]

async function handleOcrClassify(id, { imageBuffer, mimeType }) {
  self.postMessage({ type: "PROGRESS", id, progress: 10, message: "Starting OCR…" })

  try {
    const worker = await getTesseractWorker()
    const imageBlob = new Blob([imageBuffer], { type: mimeType || "image/jpeg" })

    self.postMessage({ type: "PROGRESS", id, progress: 40, message: "Reading text…" })

    const { data: { text, confidence } } = await worker.recognize(imageBlob)
    const normalized = text.replace(/\s+/g, " ").trim()

    if (!normalized || normalized.length < 8) {
      self.postMessage({
        type: "OCR_DONE",
        id,
        result: { type: "other", confidence: 25, warnings: ["Not enough text for classification."] },
      })
      return
    }

    self.postMessage({ type: "PROGRESS", id, progress: 80, message: "Classifying…" })

    let bestKey = "other"
    let bestScore = 0
    for (const rule of OCR_RULES) {
      let hits = 0
      for (const pattern of rule.patterns) {
        if (pattern.test(normalized)) hits++
      }
      if (hits > bestScore) {
        bestScore = hits
        bestKey = rule.key
      }
    }

    const ocrConf = Math.min(95, Math.round(Math.max(confidence, bestScore > 0 ? 55 + bestScore * 12 : 30)))
    const warnings = []
    if (bestKey === "other") warnings.push("Document type not matched — defaulted to Other.")
    else if (ocrConf < 65) warnings.push(`Low OCR confidence for ${bestKey} — please verify.`)

    self.postMessage({ type: "OCR_DONE", id, result: { type: bestKey, confidence: ocrConf, warnings } })
  } catch (err) {
    self.postMessage({
      type: "OCR_DONE",
      id,
      result: { type: "other", confidence: 20, warnings: [`OCR failed: ${err?.message ?? err}`] },
    })
  }
}

// ─── Image Analysis (face / signature / thumb heuristics) ───────────────────

async function handleAnalyzeImage(id, { imageBuffer, mimeType }) {
  self.postMessage({ type: "PROGRESS", id, progress: 10, message: "Analyzing image…" })

  const blob = new Blob([imageBuffer], { type: mimeType || "image/jpeg" })
  const imageBitmap = await createImageBitmap(blob)
  const { width, height } = imageBitmap

  const canvas = new OffscreenCanvas(Math.min(width, 400), Math.min(height, 400))
  const ctx = canvas.getContext("2d")
  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height)
  imageBitmap.close()

  const w = canvas.width
  const h = canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const pixels = imageData.data

  // Convert to grayscale
  const gray = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4
    gray[i] = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2])
  }

  self.postMessage({ type: "PROGRESS", id, progress: 40, message: "Running heuristics…" })

  // ── Face heuristic ──────────────────────────────────────────────────────────
  // Compare edge density in center region vs corners
  const faceScore = computeCenterEdgeDensity(gray, w, h)

  // ── Signature/Thumb heuristic ───────────────────────────────────────────────
  // Count dark pixels (ink) as fraction of total
  let darkPixels = 0
  let veryDarkPixels = 0
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < 180) darkPixels++
    if (gray[i] < 80) veryDarkPixels++
  }
  const darkRatio = darkPixels / gray.length
  const veryDarkRatio = veryDarkPixels / gray.length

  // Aspect ratio
  const aspectRatio = width / height

  // ── Classification rules ────────────────────────────────────────────────────
  let detectedType = "unknown"
  let confidence = 40

  if (faceScore > 1.3) {
    // Center has significantly more edges than corners → likely a face
    detectedType = "photo"
    confidence = Math.min(90, Math.round(50 + faceScore * 15))
  } else if (darkRatio < 0.12 && veryDarkRatio > 0.005 && aspectRatio > 1.5) {
    // Wide image, mostly white with some dark ink → signature
    detectedType = "signature"
    confidence = 75
  } else if (darkRatio < 0.12 && veryDarkRatio > 0.005 && aspectRatio <= 1.5) {
    // Roughly square or portrait, mostly white with ink → thumb
    detectedType = "thumb"
    confidence = 65
  }

  self.postMessage({
    type: "IMAGE_ANALYSIS_DONE",
    id,
    result: { detectedType, confidence, faceScore, darkRatio, veryDarkRatio, aspectRatio },
  })
}

function computeCenterEdgeDensity(gray, w, h) {
  // Center region: middle 50% of image
  const cx0 = Math.floor(w * 0.25)
  const cy0 = Math.floor(h * 0.25)
  const cx1 = Math.floor(w * 0.75)
  const cy1 = Math.floor(h * 0.75)

  // Corner region: top-left 20%
  const co0 = 0
  const co1 = Math.floor(w * 0.2)
  const co2 = 0
  const co3 = Math.floor(h * 0.2)

  function edgeDensityInRegion(x0, y0, x1, y1) {
    let edges = 0
    let total = 0
    for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) {
      for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
        const idx = y * w + x
        const diff =
          Math.abs(gray[idx] - gray[idx - 1]) +
          Math.abs(gray[idx] - gray[idx + 1]) +
          Math.abs(gray[idx] - gray[idx - w]) +
          Math.abs(gray[idx] - gray[idx + w])
        if (diff > 40) edges++
        total++
      }
    }
    return total > 0 ? edges / total : 0
  }

  const centerDensity = edgeDensityInRegion(cx0, cy0, cx1, cy1)
  const cornerDensity = edgeDensityInRegion(co0, co2, co1, co3) + 0.001

  return centerDensity / cornerDensity
}
