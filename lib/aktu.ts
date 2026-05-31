// AKTU official document specifications and helpers (2025-26 enrollment)

export type DocCategory = "photo" | "signature" | "thumb" | "document"

export interface DocSpec {
  /** key used in filename, e.g. StudentName_photo.jpg */
  key: string
  /** human label (English) */
  label: string
  /** short Hindi label for bilingual UI */
  labelHi: string
  category: DocCategory
  /** target min size in KB (for images) */
  minKB?: number
  /** max size in KB */
  maxKB: number
  /** output file extension */
  ext: "jpg" | "pdf"
  /** whether this doc is part of the standard required checklist */
  required: boolean
  hint: string
}

export const DOC_SPECS: DocSpec[] = [
  {
    key: "photo",
    label: "Passport Photo",
    labelHi: "फोटो",
    category: "photo",
    minKB: 20,
    maxKB: 50,
    ext: "jpg",
    required: true,
    hint: "Colour photo, white background, face covers ~80% of frame.",
  },
  {
    key: "signature",
    label: "Signature",
    labelHi: "हस्ताक्षर",
    category: "signature",
    minKB: 10,
    maxKB: 20,
    ext: "jpg",
    required: true,
    hint: "Black ink on white paper, horizontal scan.",
  },
  {
    key: "thumb",
    label: "Thumb Impression",
    labelHi: "Thumb",
    category: "thumb",
    minKB: 10,
    maxKB: 30,
    ext: "jpg",
    required: false,
    hint: "Clear thumb impression on a light background.",
  },
  {
    key: "10th",
    label: "10th Marksheet",
    labelHi: "10वीं अंकपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "All pages must be clearly legible.",
  },
  {
    key: "12th",
    label: "12th Marksheet",
    labelHi: "12वीं अंकपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Lateral entry: upload Diploma marksheet instead.",
  },
  {
    key: "diploma",
    label: "Diploma Marksheet",
    labelHi: "Diploma",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "For lateral entry students.",
  },
  {
    key: "tc",
    label: "Transfer Certificate",
    labelHi: "स्थानांतरण प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Original institution stamp required in scan.",
  },
  {
    key: "mc",
    label: "Migration Certificate",
    labelHi: "प्रवास प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Mandatory — enrollment is on hold without this.",
  },
  {
    key: "aadhaar",
    label: "Aadhaar Card",
    labelHi: "आधार कार्ड",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Both sides in a single file.",
  },
  {
    key: "admission",
    label: "Admission / Allotment Letter",
    labelHi: "आवंटन पत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "UPTAC allotment letter.",
  },
  {
    key: "domicile",
    label: "Domicile Certificate",
    labelHi: "निवास प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "UP state quota students only.",
  },
  {
    key: "caste",
    label: "Caste Certificate",
    labelHi: "जाति प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "SC / ST / OBC as applicable.",
  },
  {
    key: "income",
    label: "Income Certificate",
    labelHi: "आय प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "If fee waiver applicable.",
  },
  {
    key: "character",
    label: "Character Certificate",
    labelHi: "चरित्र प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "From last institution attended.",
  },
  {
    key: "gap",
    label: "Gap Affidavit",
    labelHi: "गैप प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "Only if there was a gap year between study.",
  },
  {
    key: "other",
    label: "Other Document",
    labelHi: "अन्य",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "Any additional supporting document.",
  },
]

export const COURSES = ["B.Tech", "M.Tech", "MCA", "MBA", "B.Pharm", "Other"] as const
export type Course = (typeof COURSES)[number]

export function getSpec(key: string): DocSpec {
  return DOC_SPECS.find((d) => d.key === key) ?? DOC_SPECS[DOC_SPECS.length - 1]
}

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]
export const ACCEPTED_PDF_TYPES = ["application/pdf"]
export const MAX_RAW_BYTES = 10 * 1024 * 1024 // 10 MB

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

/** Build the AKTU-ready filename for a processed doc. */
export function buildFileName(rollNumber: string, docKey: string, ext: string): string {
  const roll = rollNumber.trim().replace(/\s+/g, "") || "ROLLNO"
  return `${roll}_${docKey.toUpperCase()}.${ext}`
}

/** Fallback download name when roll number / profile is not provided. */
export function buildDownloadName(
  rollNumber: string,
  docKey: string,
  ext: string,
  originalFileName?: string,
): string {
  if (rollNumber.trim()) return buildFileName(rollNumber, docKey, ext)
  if (originalFileName) {
    const base = originalFileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_")
    return `${base || docKey}_processed.${ext}`
  }
  return `processed_${docKey}.${ext}`
}

/** Sanitize a student name for use in the ZIP filename. */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "")
}
