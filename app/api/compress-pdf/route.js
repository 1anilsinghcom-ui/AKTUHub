import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function POST(request) {
  const tmpDir = os.tmpdir()
  const inputPath = path.join(tmpDir, `input_${Date.now()}.pdf`)
  const outputPath = path.join(tmpDir, `output_${Date.now()}.pdf`)

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check if already under 500KB
    if (buffer.length < 500 * 1024) {
      return NextResponse.json({
        success: true,
        originalSizeKB: Math.round(buffer.length / 1024),
        compressedSizeKB: Math.round(buffer.length / 1024),
        skipped: true,
        fileBase64: buffer.toString('base64'),
      })
    }

    fs.writeFileSync(inputPath, buffer)

    // Try Ghostscript compression
    try {
      await execAsync(
        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`,
      )
      const compressedBuffer = fs.readFileSync(outputPath)
      return NextResponse.json({
        success: true,
        originalSizeKB: Math.round(buffer.length / 1024),
        compressedSizeKB: Math.round(compressedBuffer.length / 1024),
        fileBase64: compressedBuffer.toString('base64'),
      })
    } catch (gsError) {
      // Ghostscript not available — return original
      return NextResponse.json({
        success: true,
        originalSizeKB: Math.round(buffer.length / 1024),
        compressedSizeKB: Math.round(buffer.length / 1024),
        skipped: true,
        ghostscriptUnavailable: true,
        fileBase64: buffer.toString('base64'),
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Processing failed', details: error.message },
      { status: 500 },
    )
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
}
