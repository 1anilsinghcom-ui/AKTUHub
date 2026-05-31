export interface DetectionResult {
  docKey: string
  confidence: number
  reason: string
}

const detectionRules: Array<{ key: string; words: string[] }> = [
  { key: "photo", words: ["photo", "passport", "pic", "image", "face", "studentphoto"] },
  { key: "signature", words: ["sign", "signature", "sig"] },
  { key: "thumb", words: ["thumb", "impression", "finger"] },
  { key: "aadhaar", words: ["aadhaar", "aadhar", "adhar", "uid"] },
  { key: "10th", words: ["10th", "highschool", "high_school", "matric", "ssc"] },
  { key: "12th", words: ["12th", "intermediate", "inter", "hsc"] },
  { key: "diploma", words: ["diploma", "polytechnic"] },
  { key: "tc", words: ["tc", "transfer", "leaving"] },
  { key: "mc", words: ["migration", "mc"] },
  { key: "income", words: ["income", "aay"] },
  { key: "caste", words: ["caste", "category", "obc", "sc", "st"] },
  { key: "gap", words: ["gap", "affidavit"] },
  { key: "admission", words: ["allotment", "seat", "admission", "uptac"] },
]

export function detectDocumentType(file: File, usedKeys = new Set<string>()): DetectionResult {
  const normalized = file.name.toLowerCase().replace(/[^a-z0-9]+/g, "")
  for (const rule of detectionRules) {
    if (rule.words.some((word) => normalized.includes(word.replace(/[^a-z0-9]+/g, "")))) {
      return {
        docKey: rule.key,
        confidence: usedKeys.has(rule.key) ? 72 : 92,
        reason: `Detected from filename keyword: ${rule.words[0]}`,
      }
    }
  }

  if (file.type.startsWith("image/")) {
    if (!usedKeys.has("photo")) {
      return { docKey: "photo", confidence: 68, reason: "First image was treated as student photo." }
    }
    if (!usedKeys.has("signature")) {
      return { docKey: "signature", confidence: 62, reason: "Second image was treated as signature." }
    }
    if (!usedKeys.has("thumb")) {
      return { docKey: "thumb", confidence: 56, reason: "Additional image was treated as thumb impression." }
    }
  }

  const docOrder = ["10th", "12th", "tc", "mc", "aadhaar", "admission"]
  const nextDoc = docOrder.find((key) => !usedKeys.has(key))
  return {
    docKey: nextDoc ?? "other",
    confidence: nextDoc ? 52 : 35,
    reason: nextDoc ? "Assigned by standard enrollment checklist order." : "No strong match found.",
  }
}
