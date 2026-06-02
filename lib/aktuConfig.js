/**
 * aktuConfig.js — Single source of truth for all AKTU enrollment specifications.
 * Used by both processing logic and UI components.
 * 2025-26 enrollment cycle.
 */

// ─── Image slot dimensions ────────────────────────────────────────────────────

export const PHOTO_SPEC = {
  key: "photo",
  label: "Passport Photo",
  labelHi: "फोटो",
  category: "photo",
  // Output canvas dimensions (px)
  width: 276,
  height: 354,
  // Aspect ratio for cropper lock
  aspectRatio: 276 / 354, // ~0.779 (3.5:4.5 cm)
  // File constraints
  minKB: 20,
  maxKB: 50,
  ext: "jpg",
  required: true,
  hint: "Colour photo, white background. Face must cover ~80% of frame. Size: 3.5×4.5 cm.",
  // Face-crop scale factors (expand bounding box to include shoulders)
  faceExpandX: 1.5,
  faceExpandY: 1.8,
}

export const SIGNATURE_SPEC = {
  key: "signature",
  label: "Signature",
  labelHi: "हस्ताक्षर",
  category: "signature",
  width: 560,
  height: 160,
  aspectRatio: 560 / 160, // 3.5:1
  minKB: 10,
  maxKB: 20,
  ext: "jpg",
  required: true,
  hint: "Black ink on white paper. Scan horizontally.",
}

export const THUMB_SPEC = {
  key: "thumb",
  label: "Thumb Impression",
  labelHi: "अंगूठा",
  category: "thumb",
  width: 280,
  height: 160,
  aspectRatio: 280 / 160, // 1.75:1
  minKB: 10,
  maxKB: 30,
  ext: "jpg",
  required: false,
  hint: "Clear left thumb impression on white paper.",
}

// ─── Document slots ───────────────────────────────────────────────────────────

export const DOCUMENT_SPECS = [
  {
    key: "10th",
    label: "10th Marksheet",
    labelHi: "10वीं अंकपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "All pages clearly legible.",
    ocrKeywords: ["high school", "secondary", "class x", "10th", "matric", "ssc"],
  },
  {
    key: "12th",
    label: "12th Marksheet",
    labelHi: "12वीं अंकपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Lateral entry students: upload Diploma instead.",
    ocrKeywords: ["intermediate", "higher secondary", "class xii", "12th", "hsc"],
  },
  {
    key: "diploma",
    label: "Diploma Marksheet",
    labelHi: "डिप्लोमा",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "For lateral entry students only.",
    ocrKeywords: ["diploma", "polytechnic"],
  },
  {
    key: "tc",
    label: "Transfer Certificate",
    labelHi: "स्थानांतरण प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Original institution stamp required.",
    ocrKeywords: ["transfer certificate", "school leaving", "tc"],
  },
  {
    key: "mc",
    label: "Migration Certificate",
    labelHi: "प्रवास प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: true,
    hint: "Mandatory — enrollment on hold without this.",
    ocrKeywords: ["migration certificate", "migration"],
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
    ocrKeywords: ["aadhaar", "aadhar", "uidai", "unique identification"],
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
    ocrKeywords: ["allotment", "uptac", "seat allotment", "admission letter"],
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
    ocrKeywords: ["domicile", "residence certificate"],
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
    ocrKeywords: ["caste certificate", "obc", "sc ", "st "],
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
    ocrKeywords: ["income certificate", "annual income"],
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
    ocrKeywords: ["character certificate", "conduct certificate"],
  },
  {
    key: "gap",
    label: "Gap Affidavit",
    labelHi: "गैप प्रमाणपत्र",
    category: "document",
    maxKB: 500,
    ext: "pdf",
    required: false,
    hint: "Only if there was a gap year.",
    ocrKeywords: ["gap affidavit", "gap certificate"],
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
    ocrKeywords: [],
  },
]

// ─── All slots in one array ───────────────────────────────────────────────────

export const ALL_SPECS = [PHOTO_SPEC, SIGNATURE_SPEC, THUMB_SPEC, ...DOCUMENT_SPECS]

/** Get spec by key. Falls back to "other". */
export function getSpecByKey(key) {
  return ALL_SPECS.find((s) => s.key === key) ?? DOCUMENT_SPECS[DOCUMENT_SPECS.length - 1]
}

// ─── 9-slot verification dashboard layout ────────────────────────────────────
// These are the primary slots shown in the VerificationDashboard.

export const PRIMARY_SLOTS = [
  "photo",
  "signature",
  "thumb",
  "10th",
  "12th",
  "tc",
  "mc",
  "aadhaar",
  "admission",
]

export const ALL_SLOT_KEYS = [
  "photo",
  "signature",
  "thumb",
  "10th",
  "12th",
  "diploma",
  "tc",
  "mc",
  "aadhaar",
  "admission",
  "domicile",
  "caste",
  "income",
  "character",
  "gap",
  "other",
]

// ─── Processing constants ─────────────────────────────────────────────────────

export const BLUR_THRESHOLD = 45        // Laplacian variance below this = blurry
export const OCR_CONFIDENCE_THRESHOLD = 60  // minimum OCR confidence to auto-assign
export const FACE_SCORE_THRESHOLD = 0.5     // face-api.js score threshold
export const FACE_INPUT_SIZE = 416          // face-api.js input size
export const MAX_RAW_BYTES = 10 * 1024 * 1024  // 10 MB max upload

// ─── Filename helpers ─────────────────────────────────────────────────────────

/**
 * Build the AKTU-compliant output filename.
 * If no enrollment number provided, prefix = "STUDENT".
 */
export function buildAKTUFileName(enrollmentNumber, docKey, ext) {
  const prefix = (enrollmentNumber || "").trim().replace(/\s+/g, "") || "STUDENT"
  return `${prefix}_${docKey.toUpperCase()}.${ext}`
}

export function buildZipName(enrollmentNumber, studentName) {
  const prefix = (enrollmentNumber || "").trim() || "STUDENT"
  const name = (studentName || "")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "") || "Enrollment"
  return `${prefix}_${name}_enrollment.zip`
}
