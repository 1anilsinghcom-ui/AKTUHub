import { useCallback } from 'react'

const DOCUMENT_TYPES = {
  // Images
  photo: { label: 'Passport Photo', category: 'photo' },
  signature: { label: 'Signature', category: 'signature' },
  thumb: { label: 'Thumb Impression', category: 'thumb' },
  
  // Marksheets
  '10th': { label: '10th Marksheet', category: 'document' },
  '12th': { label: '12th Marksheet', category: 'document' },
  diploma: { label: 'Diploma Marksheet', category: 'document' },
  
  // Certificates
  tc: { label: 'Transfer Certificate', category: 'document' },
  mc: { label: 'Migration Certificate', category: 'document' },
  aadhaar: { label: 'Aadhaar Card', category: 'document' },
  admission: { label: 'Admission/Allotment Letter', category: 'document' },
  domicile: { label: 'Domicile Certificate', category: 'document' },
  caste: { label: 'Caste Certificate', category: 'document' },
  income: { label: 'Income Certificate', category: 'document' },
  character: { label: 'Character Certificate', category: 'document' },
  gap: { label: 'Gap Affidavit', category: 'document' },
  
  unknown: { label: 'Unknown Document', category: 'unknown' },
}

export function useDocumentDetector() {
  const detectDocumentType = useCallback((file) => {
    if (!file || !file.name) {
      return {
        detectedType: 'unknown',
        confidence: 'low',
        requiresConfirmation: true,
        suggestedLabel: DOCUMENT_TYPES.unknown.label,
      }
    }

    const fileName = file.name.toLowerCase()
    const fileSize = file.size
    const fileType = file.type

    // STEP 1: Check filename for keywords
    const filenameKeywords = [
      { pattern: /photo|passport/, type: 'photo', confidence: 'high' },
      { pattern: /sign|signature/, type: 'signature', confidence: 'high' },
      { pattern: /thumb|thumbprint|finger/, type: 'thumb', confidence: 'high' },
      { pattern: /10th|tenth|matric|ssc/, type: '10th', confidence: 'high' },
      { pattern: /12th|twelth|inter|hsc/, type: '12th', confidence: 'high' },
      { pattern: /diploma/, type: 'diploma', confidence: 'high' },
      { pattern: /tc|transfer/, type: 'tc', confidence: 'high' },
      { pattern: /mc|migration/, type: 'mc', confidence: 'high' },
      { pattern: /aadhaar|aadhar|adhar/, type: 'aadhaar', confidence: 'high' },
      { pattern: /admission|allotment|uptac/, type: 'admission', confidence: 'high' },
      { pattern: /domicile/, type: 'domicile', confidence: 'high' },
      { pattern: /caste|obc|sc|st/, type: 'caste', confidence: 'high' },
      { pattern: /income/, type: 'income', confidence: 'high' },
      { pattern: /character/, type: 'character', confidence: 'high' },
      { pattern: /gap/, type: 'gap', confidence: 'high' },
    ]

    for (const keyword of filenameKeywords) {
      if (keyword.pattern.test(fileName)) {
        return {
          detectedType: keyword.type,
          confidence: keyword.confidence,
          requiresConfirmation: false,
          suggestedLabel: DOCUMENT_TYPES[keyword.type].label,
        }
      }
    }

    // STEP 2: Check file type and size
    const isImage = fileType.startsWith('image/')
    const isPdf = fileType === 'application/pdf'

    if (isImage) {
      const fileSizeKB = fileSize / 1024

      if (fileSizeKB < 100) {
        // Small image files are likely signature or thumb
        return {
          detectedType: 'signature',
          confidence: 'medium',
          requiresConfirmation: true,
          suggestedLabel: 'Signature or Thumb Impression (needs confirmation)',
        }
      } else if (fileSizeKB >= 100 && fileSizeKB <= 3072) {
        // Medium-sized images are likely photos
        return {
          detectedType: 'photo',
          confidence: 'medium',
          requiresConfirmation: false,
          suggestedLabel: DOCUMENT_TYPES.photo.label,
        }
      }
    }

    if (isPdf) {
      return {
        detectedType: 'document',
        confidence: 'high',
        requiresConfirmation: false,
        suggestedLabel: 'PDF Document (marksheet/certificate)',
      }
    }

    // STEP 3: Fallback
    return {
      detectedType: 'unknown',
      confidence: 'low',
      requiresConfirmation: true,
      suggestedLabel: 'Unknown Document Type (please confirm)',
    }
  }, [])

  return { detectDocumentType }
}
