"use client"

/**
 * ManualCropModal — react-easy-crop based manual crop with locked aspect ratio.
 *
 * Opens for any slot when the user clicks "Manual Crop".
 * Aspect ratio is locked to the target slot's requirement.
 * On confirm, runs re-compression and returns the new blob.
 */

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
import { Crop, X, Check, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { getSpecByKey } from "@/lib/aktuConfig"
import imageCompression from "browser-image-compression"

interface Props {
  /** Image URL to crop (object URL or data URL) */
  imageUrl: string
  /** Target slot key — determines locked aspect ratio */
  docKey: string
  /** Called when user confirms the crop */
  onConfirm: (blob: Blob, previewUrl: string) => void
  /** Called when user cancels */
  onCancel: () => void
}

/**
 * Extract the cropped area from an image URL.
 * Returns a canvas-drawn, quality-compressed Blob.
 */
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxKB: number,
  targetW?: number,
  targetH?: number,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement("canvas")
  canvas.width = targetW ?? pixelCrop.width
  canvas.height = targetH ?? pixelCrop.height
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const rawBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/jpeg", 0.95),
  )

  // Compress to target size
  const asFile = new File([rawBlob], "crop.jpg", { type: "image/jpeg" })
  return imageCompression(asFile, {
    maxSizeMB: maxKB / 1024,
    maxWidthOrHeight: Math.max(targetW ?? 1000, targetH ?? 1000),
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  })
}

export function ManualCropModal({ imageUrl, docKey, onConfirm, onCancel }: Props) {
  const spec = getSpecByKey(docKey)
  const aspectRatio = (spec as { aspectRatio?: number }).aspectRatio ?? 1

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, pixelCrop: Area) => {
    setCroppedAreaPixels(pixelCrop)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const targetW = (spec as { width?: number }).width
      const targetH = (spec as { height?: number }).height
      const maxKB = spec.maxKB ?? 500

      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels, maxKB, targetW, targetH)
      const previewUrl = URL.createObjectURL(blob)
      onConfirm(blob, previewUrl)
    } catch (err) {
      console.error("[ManualCropModal] crop failed:", err)
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageUrl, spec, onConfirm])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Manual Crop"
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-white/10 bg-[#0b1530] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop className="size-4 text-purple-400" aria-hidden="true" />
            <h2 className="text-sm font-black text-white">Manual Crop</h2>
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-200">
              {spec.label}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-400 hover:text-white"
            onClick={onCancel}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Aspect ratio info */}
        <p className="text-xs text-slate-400">
          Aspect ratio locked to{" "}
          <span className="font-bold text-white">
            {(spec as { width?: number }).width ?? "—"}×{(spec as { height?: number }).height ?? "—"} px
          </span>
          {" "}— drag to position, scroll/pinch to zoom.
        </p>

        {/* Crop area */}
        <div className="relative h-72 w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: { border: "2px solid rgba(168,85,247,0.8)" },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
            aria-label="Zoom"
          />
          <ZoomIn className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="w-10 text-right text-xs font-bold text-slate-300">{zoom.toFixed(1)}×</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/10"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cropping…
              </span>
            ) : (
              <>
                <Check className="size-4" />
                Apply Crop
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
