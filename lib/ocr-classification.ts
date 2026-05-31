export interface OcrClassification {
  type: string
  confidence: number
  warnings: string[]
}

const OCR_RULES: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  {
    key: "aadhaar",
    label: "Aadhaar Card",
    patterns: [/aadhaar/i, /aadhar/i, /unique identification/i, /government of india/i, /uidai/i, /\b\d{4}\s?\d{4}\s?\d{4}\b/],
  },
  {
    key: "10th",
    label: "10th Marksheet",
    patterns: [/high school/i, /secondary school/i, /class\s*x\b/i, /10th/i, /matric/i, /ssc/i, /board of (high )?school/i],
  },
  {
    key: "12th",
    label: "12th Marksheet",
    patterns: [/intermediate/i, /higher secondary/i, /class\s*xii\b/i, /12th/i, /senior secondary/i, /hsc/i],
  },
  {
    key: "tc",
    label: "Transfer Certificate",
    patterns: [/transfer certificate/i, /school leaving/i, /character certificate/i, /conduct certificate/i, /\btc\b/i],
  },
  {
    key: "mc",
    label: "Migration Certificate",
    patterns: [/migration certificate/i, /migration/i, /inter.?university/i],
  },
  {
    key: "admission",
    label: "Allotment Letter",
    patterns: [/allotment/i, /uptac/i, /seat allotment/i, /admission letter/i, /counselling/i, /institute allotted/i],
  },
  {
    key: "diploma",
    label: "Diploma Marksheet",
    patterns: [/diploma/i, /polytechnic/i],
  },
  {
    key: "income",
    label: "Income Certificate",
    patterns: [/income certificate/i, /annual income/i],
  },
  {
    key: "caste",
    label: "Caste Certificate",
    patterns: [/caste certificate/i, /\bobc\b/i, /\bsc\b/i, /\bst\b/i, /category certificate/i],
  },
]

let workerPromise: Promise<import("tesseract.js").Worker> | null = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await import("tesseract.js")
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: () => {},
      })
      return worker
    })()
  }
  return workerPromise
}

export async function classifyDocumentOcr(imageBlob: Blob): Promise<OcrClassification> {
  const warnings: string[] = []
  try {
    const worker = await getWorker()
    const {
      data: { text, confidence },
    } = await worker.recognize(imageBlob)
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized || normalized.length < 8) {
      return {
        type: "other",
        confidence: 25,
        warnings: ["OCR could not read enough text — classification may be inaccurate."],
      }
    }

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
    if (bestKey === "other") {
      warnings.push("Document type could not be matched from OCR text — defaulted to Other Document.")
    } else if (ocrConf < 65) {
      warnings.push(`OCR classification for ${bestKey} has low confidence — please verify document type.`)
    }

    return { type: bestKey, confidence: ocrConf, warnings }
  } catch (err) {
    warnings.push(
      err instanceof Error ? `OCR failed: ${err.message}` : "OCR engine unavailable — using filename heuristics only.",
    )
    return { type: "other", confidence: 20, warnings }
  }
}

export function mergeOcrWithFilename(
  filenameKey: string,
  filenameConfidence: number,
  ocr: OcrClassification,
): { docKey: string; confidence: number; reason: string } {
  if (ocr.confidence > filenameConfidence + 8 && ocr.type !== "other") {
    return {
      docKey: ocr.type,
      confidence: ocr.confidence,
      reason: `OCR classified as ${ocr.type} (${ocr.confidence}% confidence).`,
    }
  }
  if (filenameConfidence >= 70) {
    return {
      docKey: filenameKey,
      confidence: filenameConfidence,
      reason: `Filename hint: ${filenameKey} (${filenameConfidence}% confidence).`,
    }
  }
  if (ocr.type !== "other") {
    return {
      docKey: ocr.type,
      confidence: ocr.confidence,
      reason: `OCR classified as ${ocr.type} (${ocr.confidence}% confidence).`,
    }
  }
  return {
    docKey: filenameKey,
    confidence: filenameConfidence,
    reason: `Assigned as ${filenameKey} from upload heuristics.`,
  }
}
