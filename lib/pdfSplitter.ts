/**
 * pdfSplitter.ts — Client-side PDF page splitter using pdfjs-dist + pdf-lib.
 *
 * For each page:
 *  - Renders a JPEG preview via pdfjs-dist canvas rendering
 *  - Extracts a single-page PDF via pdf-lib (preserving original vector quality)
 */

export interface PdfPage {
  id: string
  pdfBlob: Blob
  previewBlob: Blob
  previewUrl: string
  pageNumber: number
  totalPages: number
}

let pdfjsModule: typeof import("pdfjs-dist") | null = null

async function getPdfjs() {
  if (pdfjsModule) return pdfjsModule
  const m = await import("pdfjs-dist")
  if (typeof window !== "undefined") {
    m.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${m.version}/build/pdf.worker.min.mjs`
  }
  pdfjsModule = m
  return m
}

let idCounter = 0
const nextPageId = () => `page-${Date.now()}-${idCounter++}`

/**
 * Split a PDF file into individual page objects.
 * Each page has a rendered JPEG preview and an extracted single-page PDF blob.
 *
 * @param file  The PDF File to split
 * @param onProgress  Optional callback (0–100)
 */
export async function splitPdfIntoPages(
  file: File,
  onProgress?: (pct: number, message: string) => void,
): Promise<PdfPage[]> {
  onProgress?.(5, "Loading PDF…")

  const [pdfjs, { PDFDocument }] = await Promise.all([
    getPdfjs(),
    import("pdf-lib"),
  ])

  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  // Load with pdfjs for rendering
  const pdfjsDoc = await pdfjs.getDocument({ data }).promise
  const totalPages = pdfjsDoc.numPages

  onProgress?.(15, `PDF has ${totalPages} page(s)…`)

  // Load with pdf-lib for extraction
  const pdfLibDoc = await PDFDocument.load(data)

  const pages: PdfPage[] = []

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageNumber = pageIndex + 1
    const progressPct = 15 + Math.round((pageIndex / totalPages) * 80)
    onProgress?.(progressPct, `Splitting page ${pageNumber} of ${totalPages}…`)

    // ── Render preview ────────────────────────────────────────────────────────
    const pdfjsPage = await pdfjsDoc.getPage(pageNumber)
    const viewport = pdfjsPage.getViewport({ scale: 1.5 })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext("2d")!
    await pdfjsPage.render({ canvasContext: ctx, viewport, canvas }).promise
    const previewBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Preview render failed"))), "image/jpeg", 0.85),
    )

    // ── Extract single-page PDF ───────────────────────────────────────────────
    const singleDoc = await PDFDocument.create()
    const [copiedPage] = await singleDoc.copyPages(pdfLibDoc, [pageIndex])
    singleDoc.addPage(copiedPage)
    const pdfBytes = await singleDoc.save()
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" })

    pages.push({
      id: nextPageId(),
      pdfBlob,
      previewBlob,
      previewUrl: URL.createObjectURL(previewBlob),
      pageNumber,
      totalPages,
    })
  }

  onProgress?.(100, "Done.")
  return pages
}
