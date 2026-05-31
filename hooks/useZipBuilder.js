'use client'

import JSZip from 'jszip'
import { getAKTUFileName, getZipFileName } from '@/lib/aktunaming'

export function useZipBuilder() {
  const buildEnrollmentZip = async (rollNumber, studentName, processedDocuments) => {
    try {
      // Step 1: Create new zip
      const zip = new JSZip()

      // Step 2: Add all documents
      for (const doc of processedDocuments) {
        const fileName = getAKTUFileName(rollNumber, doc.docType, doc.isImage)
        const buffer = await doc.processedFile.arrayBuffer()
        zip.file(fileName, buffer)
      }

      // Step 3: Build summary.txt
      const lines = [
        'EasyEnroll — AKTU Enrollment Package',
        `Roll Number: ${rollNumber}`,
        `Student Name: ${studentName}`,
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        '------------------------------------',
        'FILES INCLUDED:',
        ...processedDocuments.map(
          (d) =>
            `${getAKTUFileName(rollNumber, d.docType, d.isImage)} — ${d.processedSizeKB} KB`,
        ),
        '',
        'MISSING DOCUMENTS:',
      ]

      const MANDATORY = ['photo', 'signature', '10th', '12th', 'tc', 'mc', 'aadhaar', 'admission']
      const uploadedTypes = processedDocuments.map((d) => d.docType)
      const missing = MANDATORY.filter((m) => !uploadedTypes.includes(m))

      if (missing.length === 0) {
        lines.push('None — all mandatory documents included ✓')
      } else {
        missing.forEach((m) => lines.push(`MISSING: ${m}`))
      }

      zip.file('summary.txt', lines.join('\n'))

      // Step 4: Generate blob with compression
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })

      // Step 5: Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getZipFileName(rollNumber, studentName)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Step 6: Return success
      return {
        success: true,
        totalFiles: processedDocuments.length,
        missingDocs: missing,
      }
    } catch (error) {
      console.error('[useZipBuilder] Error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  return { buildEnrollmentZip }
}
