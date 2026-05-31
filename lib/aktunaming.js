export const DOC_TYPE_MAP = {
  "photo": "photo",
  "signature": "signature",
  "thumb": "thumb",
  "10th": "10th",
  "12th": "12th",
  "diploma": "diploma",
  "tc": "tc",
  "mc": "mc",
  "aadhaar": "aadhaar",
  "admission": "admission",
  "domicile": "domicile",
  "caste": "caste",
  "income": "income",
  "character": "character",
  "gap": "gap",
  "abc_id": "abc_id"
}

export function getAKTUFileName(rollNumber, docType, isImage) {
  const ext = isImage ? "jpg" : "pdf"
  const docCode = DOC_TYPE_MAP[docType] || docType
  return `${rollNumber}_${docCode}.${ext}`
}

export function getZipFileName(rollNumber, studentName) {
  const cleanName = studentName.replace(/\s+/g, '')
  return `${rollNumber}_${cleanName}_enrollment.zip`
}
