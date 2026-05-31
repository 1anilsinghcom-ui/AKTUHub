'use client'

import { useState, useCallback } from 'react'
import imageCompression from 'browser-image-compression'

// SECTION A: BLUR DETECTION FUNCTION
function detectBlur(imageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageElement, 0, 0, 256, 256)
  const imageData = ctx.getImageData(0, 0, 256, 256)
  const pixels = imageData.data

  // Convert to grayscale
  const gray = []
  for (let i = 0; i < pixels.length; i += 4) {
    gray.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
  }

  // Laplacian kernel
  const kernel = [-1, -1, -1, -1, 8, -1, -1, -1, -1]
  let variance = 0
  const w = 256
  for (let y = 1; y < 255; y++) {
    for (let x = 1; x < 255; x++) {
      let sum = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * w + (x + kx)] * kernel[(ky + 1) * 3 + (kx + 1)]
        }
      }
      variance += sum * sum
    }
  }
  variance /= 254 * 254
  return variance < 50 // Returns true if blurry
}

// SECTION B: SIGNATURE CROP FUNCTION
function cropToInkBoundingBox(canvas) {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  let top = canvas.height,
    bottom = 0,
    left = canvas.width,
    right = 0

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4
      const brightness = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
      if (brightness < 200) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  const padding = 10
  top = Math.max(0, top - padding)
  bottom = Math.min(canvas.height, bottom + padding)
  left = Math.max(0, left - padding)
  right = Math.min(canvas.width, right + padding)

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = right - left
  croppedCanvas.height = bottom - top
  const croppedCtx = croppedCanvas.getContext('2d')
  croppedCtx.drawImage(canvas, left, top, right - left, bottom - top, 0, 0, right - left, bottom - top)
  return croppedCanvas
}

export function useImageProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)

  const processImage = useCallback(async (file, docType) => {
    setIsProcessing(true)
    try {
      // SECTION C: MAIN PROCESSING LOGIC

      // For PDF/document types
      if (
        docType === '10th' ||
        docType === '12th' ||
        docType === 'tc' ||
        docType === 'mc' ||
        docType === 'aadhaar' ||
        docType === 'admission' ||
        docType === 'domicile' ||
        docType === 'caste' ||
        docType === 'income' ||
        docType === 'character' ||
        docType === 'gap' ||
        docType === 'diploma' ||
        file.type === 'application/pdf'
      ) {
        return {
          isPDF: true,
          requiresServerProcessing: true,
          file: file,
          originalSizeKB: (file.size / 1024).toFixed(2),
        }
      }

      // === PHOTO PROCESSING ===
      if (docType === 'photo') {
        // Step 1: Load file as image element
        const imageUrl = URL.createObjectURL(file)
        const imageElement = new Image()

        await new Promise((resolve, reject) => {
          imageElement.onload = resolve
          imageElement.onerror = reject
          imageElement.src = imageUrl
        })

        // Step 2: Check for blur
        const isBlurry = detectBlur(imageElement)
        if (isBlurry) {
          URL.revokeObjectURL(imageUrl)
          return {
            error: true,
            errorCode: 'BLURRY',
            messageHindi: 'Tasveer dhundali hai, dobara upload karein',
            messageEnglish: 'Photo is blurry — please upload a clearer image',
          }
        }

        // Step 3: Convert to JPEG first
        let jpegFile = await imageCompression(file, {
          fileType: 'image/jpeg',
          useWebWorker: true,
        })

        // Step 4: Face detection
        let faceDetected = false
        let faceWarning = null

        try {
          const faceapi = await import('face-api.js')
          const detection = await faceapi.detectSingleFace(
            imageElement,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
          )

          if (detection && detection.box) {
            faceDetected = true
            // Extract face region with 30% padding
            const box = detection.box
            const padding = Math.max(box.width, box.height) * 0.3
            const left = Math.max(0, box.x - padding)
            const top = Math.max(0, box.y - padding)
            const width = Math.min(imageElement.width - left, box.width + padding * 2)
            const height = Math.min(imageElement.height - top, box.height + padding * 2)

            // Draw cropped face on canvas (300x400px)
            const faceCanvas = document.createElement('canvas')
            faceCanvas.width = 300
            faceCanvas.height = 400
            const faceCtx = faceCanvas.getContext('2d')
            faceCtx.drawImage(imageElement, left, top, width, height, 0, 0, 300, 400)

            // Convert canvas to blob
            jpegFile = await new Promise((resolve) => {
              faceCanvas.toBlob((blob) => {
                resolve(new File([blob], 'face.jpg', { type: 'image/jpeg' }))
              }, 'image/jpeg', 0.95)
            })
          } else {
            faceDetected = false
            faceWarning = {
              messageHindi: 'Photo mein chehra nahi mila, manual crop karein',
              messageEnglish: 'No face detected — please crop manually',
            }
          }
        } catch (err) {
          // Face detection library not ready, skip
          faceWarning = {
            messageHindi: 'Chehra pehchan skipped',
            messageEnglish: 'Face detection unavailable',
          }
        }

        // Step 5: Compress iteratively to 20KB-50KB range
        let quality = 0.8
        let compressedFile = jpegFile
        let attempts = 0
        const maxAttempts = 8

        while (attempts < maxAttempts) {
          compressedFile = await imageCompression(jpegFile, {
            maxSizeMB: 0.05,
            initialQuality: quality,
            fileType: 'image/jpeg',
            useWebWorker: true,
          })

          const sizeKB = compressedFile.size / 1024

          if (sizeKB < 20) {
            quality = Math.min(1, quality + 0.1)
          } else if (sizeKB > 50) {
            quality = Math.max(0.1, quality - 0.1)
          } else {
            // In range, done
            break
          }

          attempts++
        }

        const originalPreviewUrl = imageUrl
        const processedPreviewUrl = URL.createObjectURL(compressedFile)

        const warnings = []
        if (faceWarning) warnings.push(faceWarning)

        return {
          processedFile: compressedFile,
          originalSizeKB: (file.size / 1024).toFixed(2),
          processedSizeKB: (compressedFile.size / 1024).toFixed(2),
          originalPreviewUrl,
          processedPreviewUrl,
          faceDetected,
          warnings,
          error: null,
        }
      }

      // === SIGNATURE / THUMB PROCESSING ===
      if (docType === 'signature' || docType === 'thumb') {
        // Step 1: Load file as image
        const imageUrl = URL.createObjectURL(file)
        const imageElement = new Image()

        await new Promise((resolve, reject) => {
          imageElement.onload = resolve
          imageElement.onerror = reject
          imageElement.src = imageUrl
        })

        // Step 2: Draw on canvas with grayscale + contrast
        const canvas = document.createElement('canvas')
        canvas.width = imageElement.width
        canvas.height = imageElement.height
        const ctx = canvas.getContext('2d')
        ctx.filter = 'grayscale(100%) contrast(200%)'
        ctx.drawImage(imageElement, 0, 0)

        // Step 3: Crop to ink bounding box
        const croppedCanvas = cropToInkBoundingBox(canvas)

        // Step 4: Convert cropped canvas to blob
        const croppedBlob = await new Promise((resolve) => {
          croppedCanvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/jpeg', 0.92)
        })

        const croppedFile = new File([croppedBlob], `${docType}.jpg`, { type: 'image/jpeg' })

        // Step 5: Compress to 10KB-20KB
        let quality = 0.8
        let compressedFile = croppedFile
        let attempts = 0
        const maxAttempts = 8

        while (attempts < maxAttempts) {
          compressedFile = await imageCompression(croppedFile, {
            maxSizeMB: 0.02,
            initialQuality: quality,
            fileType: 'image/jpeg',
            useWebWorker: true,
          })

          const sizeKB = compressedFile.size / 1024

          if (sizeKB < 10) {
            quality = Math.min(1, quality + 0.1)
          } else if (sizeKB > 20) {
            quality = Math.max(0.1, quality - 0.1)
          } else {
            // In range, done
            break
          }

          attempts++
        }

        const originalPreviewUrl = imageUrl
        const processedPreviewUrl = URL.createObjectURL(compressedFile)

        return {
          processedFile: compressedFile,
          originalSizeKB: (file.size / 1024).toFixed(2),
          processedSizeKB: (compressedFile.size / 1024).toFixed(2),
          originalPreviewUrl,
          processedPreviewUrl,
          warnings: [],
          error: null,
        }
      }

      // Unknown document type
      return {
        error: true,
        errorCode: 'UNKNOWN_TYPE',
        messageEnglish: 'Unknown document type',
        messageHindi: 'Aanjaan document type',
      }
    } catch (err) {
      console.error('[useImageProcessor] Error:', err)
      return {
        error: true,
        errorCode: 'PROCESSING_ERROR',
        messageEnglish: `Processing failed: ${err.message}`,
        messageHindi: 'Processing mein error ayi',
      }
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return {
    processImage,
    isProcessing,
  }
}
