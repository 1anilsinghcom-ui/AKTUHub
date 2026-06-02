/**
 * imageCropper.ts — Auto-crop utilities for photo, signature, and thumb impression.
 *
 * Photo crop:  face-api.js bounding box → expand to include shoulders → resize to 276×354 px → compress < 50 KB
 * Signature:   grayscale threshold → contour bounding rect (canvas pixel scan) → resize to 560×160 px → compress
 * Thumb:       same as signature → resize to 280×160 px → compress
 *
 * Falls back gracefully: if face detection fails, returns the original blob.
 */

import imageCompression from "browser-image-compression"
import { PHOTO_SPEC, SIGNATURE_SPEC, THUMB_SPEC } from "./aktuConfig"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CropResult {
  blob: Blob
  previewUrl: string
  autoFixes: string[]
  usedFallback: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not decode image"))
    img.src = src
  })
}

async function blobToImage(blob: Blob): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(blob)
  const img = await loadImageElement(url)
  return { img, url }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/jpeg", quality),
  )
}

async function compressToTarget(blob: Blob, maxKB: number, maxDim: number): Promise<Blob> {
  const asFile =
    blob instanceof File ? blob : new File([blob], "input.jpg", { type: "image/jpeg" })
  return imageCompression(asFile, {
    maxSizeMB: maxKB / 1024,
    maxWidthOrHeight: maxDim,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  })
}

// ─── Photo crop (face-api.js) ─────────────────────────────────────────────────

let faceApiLoaded = false

async function ensureFaceApiLoaded() {
  if (faceApiLoaded) return
  const faceapi = await import("face-api.js")
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
  faceApiLoaded = true
}

/**
 * Detect face bounding box, expand to include shoulders, crop canvas to
 * 276×354 px (AKTU passport photo), compress to < 50 KB.
 *
 * Falls back to a smart geometric crop if no face is found.
 */
export async function cropPhoto(blob: Blob): Promise<CropResult> {
  const autoFixes: string[] = []
  const { img, url } = await blobToImage(blob)
  const w = img.naturalWidth
  const h = img.naturalHeight

  let cropX = 0, cropY = 0, cropW = w, cropH = h
  let usedFallback = false

  try {
    await ensureFaceApiLoaded()
    const faceapi = await import("face-api.js")

    const detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: PHOTO_SPEC.width < 300 ? 224 : 416,
        scoreThreshold: 0.5,
      }),
    )

    if (detection) {
      const box = detection.box
      // Expand bounding box to include shoulders
      const expandedW = box.width * PHOTO_SPEC.faceExpandX
      const expandedH = box.height * PHOTO_SPEC.faceExpandY
      const centerX = box.x + box.width / 2
      const centerY = box.y + box.height / 2

      cropX = Math.max(0, centerX - expandedW / 2)
      cropY = Math.max(0, centerY - expandedH / 3) // bias upward (include top of head)
      cropW = Math.min(w - cropX, expandedW)
      cropH = Math.min(h - cropY, expandedH)

      autoFixes.push("Face detected — auto-cropped to include face and shoulders.")
    } else {
      // Geometric fallback — centre crop 70% width, 85% height from top
      cropX = Math.floor(w * 0.15)
      cropY = Math.floor(h * 0.04)
      cropW = Math.floor(w * 0.7)
      cropH = Math.floor(h * 0.85)
      usedFallback = true
      autoFixes.push("No face detected — used geometric center crop as fallback.")
    }
  } catch {
    // Face-api unavailable — geometric fallback
    cropX = Math.floor(w * 0.15)
    cropY = Math.floor(h * 0.04)
    cropW = Math.floor(w * 0.7)
    cropH = Math.floor(h * 0.85)
    usedFallback = true
    autoFixes.push("Face detection skipped — used geometric crop.")
  } finally {
    URL.revokeObjectURL(url)
  }

  // Force aspect ratio to PHOTO_SPEC (276:354 ≈ 3.5:4.5)
  const targetAspect = PHOTO_SPEC.width / PHOTO_SPEC.height
  const currentAspect = cropW / cropH
  if (currentAspect > targetAspect) {
    const newW = cropH * targetAspect
    cropX += (cropW - newW) / 2
    cropW = newW
  } else {
    const newH = cropW / targetAspect
    cropY += (cropH - newH) / 2
    cropH = newH
  }

  // Draw on output canvas
  const canvas = document.createElement("canvas")
  canvas.width = PHOTO_SPEC.width
  canvas.height = PHOTO_SPEC.height
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, PHOTO_SPEC.width, PHOTO_SPEC.height)
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, PHOTO_SPEC.width, PHOTO_SPEC.height)

  const cropped = await canvasToBlob(canvas)
  const compressed = await compressToTarget(cropped, PHOTO_SPEC.maxKB, PHOTO_SPEC.width * 2)
  autoFixes.push(`Photo resized to ${PHOTO_SPEC.width}×${PHOTO_SPEC.height} px and compressed to ≤ ${PHOTO_SPEC.maxKB} KB.`)

  const previewUrl = URL.createObjectURL(compressed)
  return { blob: compressed, previewUrl, autoFixes, usedFallback }
}

// ─── Signature / Thumb crop (canvas contour bounding rect) ───────────────────

interface ContourBounds {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Find the bounding rect of all ink pixels (pixels darker than threshold).
 * Returns null if no ink found.
 */
function findInkBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 180,
): ContourBounds | null {
  let minX = width, minY = height, maxX = 0, maxY = 0
  let found = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum < threshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
        found = true
      }
    }
  }

  if (!found) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

async function cropInkRegion(
  blob: Blob,
  targetW: number,
  targetH: number,
  maxKB: number,
  label: string,
): Promise<CropResult> {
  const autoFixes: string[] = []
  const { img, url } = await blobToImage(blob)

  const srcW = img.naturalWidth
  const srcH = img.naturalHeight

  // Convert to grayscale on canvas
  const src = document.createElement("canvas")
  src.width = srcW
  src.height = srcH
  const ctx = src.getContext("2d")!
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)

  const imageData = ctx.getImageData(0, 0, srcW, srcH)
  const d = imageData.data

  // Enhance contrast for better ink detection
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const boosted = Math.max(0, Math.min(255, (v - 128) * 1.6 + 128))
    d[i] = d[i + 1] = d[i + 2] = boosted
  }
  ctx.putImageData(imageData, 0, 0)

  const bounds = findInkBounds(d, srcW, srcH, 160)

  let usedFallback = false
  let sx = 0, sy = 0, sw = srcW, sh = srcH

  if (bounds) {
    // Add 8% padding around ink
    const padX = Math.max(8, Math.round(bounds.w * 0.08))
    const padY = Math.max(8, Math.round(bounds.h * 0.08))
    sx = Math.max(0, bounds.x - padX)
    sy = Math.max(0, bounds.y - padY)
    sw = Math.min(srcW - sx, bounds.w + padX * 2)
    sh = Math.min(srcH - sy, bounds.h + padY * 2)
    autoFixes.push(`Detected ink contour bounds — cropped ${label} to ink region.`)
  } else {
    usedFallback = true
    autoFixes.push(`No ink found — using full image for ${label}.`)
  }

  // Force target aspect ratio
  const targetAspect = targetW / targetH
  const currentAspect = sw / sh
  if (currentAspect > targetAspect) {
    const newSh = sw / targetAspect
    sy = Math.max(0, sy - (newSh - sh) / 2)
    sh = newSh
  } else {
    const newSw = sh * targetAspect
    sx = Math.max(0, sx - (newSw - sw) / 2)
    sw = newSw
  }

  // Draw output
  const out = document.createElement("canvas")
  out.width = targetW
  out.height = targetH
  const outCtx = out.getContext("2d")!
  outCtx.fillStyle = "#FFFFFF"
  outCtx.fillRect(0, 0, targetW, targetH)
  outCtx.drawImage(src, sx, sy, sw, sh, 0, 0, targetW, targetH)

  const cropped = await canvasToBlob(out, 0.95)
  const compressed = await compressToTarget(cropped, maxKB, targetW * 2)
  autoFixes.push(`${label} resized to ${targetW}×${targetH} px and compressed to ≤ ${maxKB} KB.`)

  const previewUrl = URL.createObjectURL(compressed)
  return { blob: compressed, previewUrl, autoFixes, usedFallback }
}

export async function cropSignature(blob: Blob): Promise<CropResult> {
  return cropInkRegion(blob, SIGNATURE_SPEC.width, SIGNATURE_SPEC.height, SIGNATURE_SPEC.maxKB, "Signature")
}

export async function cropThumb(blob: Blob): Promise<CropResult> {
  return cropInkRegion(blob, THUMB_SPEC.width, THUMB_SPEC.height, THUMB_SPEC.maxKB, "Thumb Impression")
}
