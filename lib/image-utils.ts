export interface ImageTransformResult {
  blob: Blob
  fixes: string[]
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not decode image"))
    img.src = src
  })
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImageElement(url)
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality)
  })
}

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function isContentPixel(r: number, g: number, b: number, whiteThreshold = 240) {
  const lum = luminance(r, g, b)
  if (lum < whiteThreshold) return true
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max - min > 18
}

function findContentBounds(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  whiteThreshold = 240,
  minCoverage = 0.002,
) {
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  let count = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (isContentPixel(data[i], data[i + 1], data[i + 2], whiteThreshold)) {
        count++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (count < w * h * minCoverage) return null
  return { minX, minY, maxX, maxY }
}

function cropCanvas(
  source: HTMLCanvasElement,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  paddingRatio = 0.015,
): HTMLCanvasElement {
  const padX = Math.round((bounds.maxX - bounds.minX + 1) * paddingRatio)
  const padY = Math.round((bounds.maxY - bounds.minY + 1) * paddingRatio)
  const x = Math.max(0, bounds.minX - padX)
  const y = Math.max(0, bounds.minY - padY)
  const w = Math.min(source.width - x, bounds.maxX - bounds.minX + 1 + padX * 2)
  const h = Math.min(source.height - y, bounds.maxY - bounds.minY + 1 + padY * 2)
  const out = document.createElement("canvas")
  out.width = Math.max(1, w)
  out.height = Math.max(1, h)
  const ctx = out.getContext("2d")!
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h)
  return out
}

function rotateCanvas(source: HTMLCanvasElement, angleDeg: number): HTMLCanvasElement {
  const rad = (angleDeg * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const w = source.width
  const h = source.height
  const out = document.createElement("canvas")
  out.width = Math.ceil(w * cos + h * sin)
  out.height = Math.ceil(w * sin + h * cos)
  const ctx = out.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(source, -w / 2, -h / 2)
  return out
}

function horizontalProjectionScore(gray: Float32Array, w: number, h: number) {
  const rowSums = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = 0; x < w; x++) {
      const v = gray[y * w + x]
      if (v < 200) sum++
    }
    rowSums[y] = sum
  }
  const mean = rowSums.reduce((a, b) => a + b, 0) / h
  let variance = 0
  for (let y = 0; y < h; y++) {
    const d = rowSums[y] - mean
    variance += d * d
  }
  return variance / h
}

function detectSkewAngle(canvas: HTMLCanvasElement): number {
  const maxDim = 400
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height))
  const w = Math.max(1, Math.round(canvas.width * scale))
  const h = Math.max(1, Math.round(canvas.height * scale))
  const tmp = document.createElement("canvas")
  tmp.width = w
  tmp.height = h
  const ctx = tmp.getContext("2d")!
  ctx.drawImage(canvas, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  }

  let bestAngle = 0
  let bestScore = -1
  for (let angle = -12; angle <= 12; angle++) {
    const rotated = rotateCanvas(tmp, angle)
    const rCtx = rotated.getContext("2d")!
    const rData = rCtx.getImageData(0, 0, rotated.width, rotated.height).data
    const rGray = new Float32Array(rotated.width * rotated.height)
    for (let i = 0; i < rGray.length; i++) {
      rGray[i] = luminance(rData[i * 4], rData[i * 4 + 1], rData[i * 4 + 2])
    }
    const score = horizontalProjectionScore(rGray, rotated.width, rotated.height)
    if (score > bestScore) {
      bestScore = score
      bestAngle = angle
    }
  }
  return Math.abs(bestAngle) >= 0.5 ? bestAngle : 0
}

/** Remove white scanner margins and blank borders around document content. */
export async function autoCropImage(blob: Blob): Promise<ImageTransformResult> {
  const fixes: string[] = []
  try {
    const canvas = await blobToCanvas(blob)
    const sampleMax = 900
    const scale = Math.min(1, sampleMax / Math.max(canvas.width, canvas.height))
    const sw = Math.max(1, Math.round(canvas.width * scale))
    const sh = Math.max(1, Math.round(canvas.height * scale))
    const sample = document.createElement("canvas")
    sample.width = sw
    sample.height = sh
    const sCtx = sample.getContext("2d")!
    sCtx.drawImage(canvas, 0, 0, sw, sh)
    const bounds = findContentBounds(sCtx.getImageData(0, 0, sw, sh).data, sw, sh, 238)
    if (!bounds) return { blob, fixes }

    const fullBounds = {
      minX: Math.floor(bounds.minX / scale),
      minY: Math.floor(bounds.minY / scale),
      maxX: Math.min(canvas.width - 1, Math.ceil(bounds.maxX / scale)),
      maxY: Math.min(canvas.height - 1, Math.ceil(bounds.maxY / scale)),
    }
    const croppedW = fullBounds.maxX - fullBounds.minX
    const croppedH = fullBounds.maxY - fullBounds.minY
    if (croppedW < canvas.width * 0.92 || croppedH < canvas.height * 0.92) {
      const cropped = cropCanvas(canvas, fullBounds)
      fixes.push("Auto-cropped white margins and blank borders.")
      return { blob: await canvasToBlob(cropped), fixes }
    }
    return { blob, fixes }
  } catch {
    return { blob, fixes: ["Auto-crop skipped — could not analyze image boundaries."] }
  }
}

/** Detect and correct document skew. */
export async function autoRotateImage(blob: Blob): Promise<ImageTransformResult> {
  const fixes: string[] = []
  try {
    const canvas = await blobToCanvas(blob)
    const angle = detectSkewAngle(canvas)
    if (Math.abs(angle) < 0.5) return { blob, fixes }
    const rotated = rotateCanvas(canvas, angle)
    fixes.push(`Auto-rotated document by ${angle.toFixed(1)}° to straighten skew.`)
    return { blob: await canvasToBlob(rotated), fixes }
  } catch {
    return { blob, fixes: ["Auto-rotation skipped — skew detection failed."] }
  }
}

/** Boost contrast and sharpness for OCR readability. */
export async function enhanceDocument(blob: Blob): Promise<ImageTransformResult> {
  const fixes: string[] = []
  try {
    const canvas = await blobToCanvas(blob)
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data
    const contrast = 1.25
    const sharpen = 0.35

    const gray = new Float32Array(canvas.width * canvas.height)
    for (let i = 0; i < d.length; i += 4) {
      gray[i / 4] = luminance(d[i], d[i + 1], d[i + 2])
    }

    for (let i = 0; i < d.length; i += 4) {
      let v = gray[i / 4]
      v = (v - 128) * contrast + 128
      v = Math.max(0, Math.min(255, v))
      d[i] = d[i + 1] = d[i + 2] = v
    }

    const w = canvas.width
    const h = canvas.height
    const copy = new Uint8ClampedArray(d)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4
        const center = copy[idx]
        const blur =
          (copy[idx - 4] +
            copy[idx + 4] +
            copy[idx - w * 4] +
            copy[idx + w * 4]) /
          4
        const sharp = center + sharpen * (center - blur)
        const v = Math.max(0, Math.min(255, sharp))
        d[idx] = d[idx + 1] = d[idx + 2] = v
      }
    }

    ctx.putImageData(imageData, 0, 0)
    fixes.push("Enhanced contrast and sharpness for better readability.")
    return { blob: await canvasToBlob(canvas), fixes }
  } catch {
    return { blob, fixes: ["Document enhancement skipped."] }
  }
}

/** Tight crop around signature / thumb ink. */
export async function cropWhitespace(blob: Blob): Promise<ImageTransformResult> {
  const fixes: string[] = []
  try {
    const canvas = await blobToCanvas(blob)
    const ctx = canvas.getContext("2d")!
    const bounds = findContentBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, 248, 0.0005)
    if (!bounds) return { blob, fixes }
    const cropped = cropCanvas(canvas, bounds, 0.04)
    if (cropped.width < canvas.width * 0.95 || cropped.height < canvas.height * 0.95) {
      fixes.push("Cropped excess whitespace around signature/thumb.")
      return { blob: await canvasToBlob(cropped), fixes }
    }
    return { blob, fixes }
  } catch {
    return { blob, fixes: [] }
  }
}

/** Lightweight face-in-frame heuristic for passport photos. */
export async function faceCheck(blob: Blob): Promise<{ ok: boolean; warning?: string }> {
  try {
    const canvas = await blobToCanvas(blob)
    const w = canvas.width
    const h = canvas.height
    const ctx = canvas.getContext("2d")!
    const { data } = ctx.getImageData(0, 0, w, h)

    const regionScore = (x0: number, y0: number, x1: number, y1: number) => {
      let edges = 0
      let colorVar = 0
      let n = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4
          const lum = luminance(data[i], data[i + 1], data[i + 2])
          if (x > x0 && y > y0) {
            const pi = ((y - 1) * w + (x - 1)) * 4
            const prev = luminance(data[pi], data[pi + 1], data[pi + 2])
            if (Math.abs(lum - prev) > 12) edges++
          }
          colorVar += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
          n++
        }
      }
      return { edges: edges / n, colorVar: colorVar / n }
    }

    const cx0 = Math.floor(w * 0.25)
    const cy0 = Math.floor(h * 0.15)
    const cx1 = Math.floor(w * 0.75)
    const cy1 = Math.floor(h * 0.85)
    const corner = regionScore(0, 0, Math.floor(w * 0.2), Math.floor(h * 0.2))
    const center = regionScore(cx0, cy0, cx1, cy1)

    if (center.edges > corner.edges * 1.15 && center.colorVar > 8) {
      return { ok: true }
    }
    return {
      ok: false,
      warning:
        "Face may not be centered or clearly visible. Use a passport-style photo with the face covering most of the frame.",
    }
  } catch {
    return { ok: true }
  }
}

export { loadImageElement, luminance }
