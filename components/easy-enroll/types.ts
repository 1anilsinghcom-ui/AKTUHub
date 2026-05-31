import type { ProcessResult } from "@/lib/processing"

export interface StudentInfo {
  rollNumber: string
  fullName: string
  branch: string
}

export type DocItemStatus = "queued" | "processing" | "ok" | "flagged" | "error"

export interface DocItem {
  id: string
  file: File
  docKey: string
  status: DocItemStatus
  originalSize: number
  originalPreviewUrl: string
  detectionConfidence?: number
  detectionReason?: string
  result?: ProcessResult
  error?: string
}

export const EMPTY_STUDENT: StudentInfo = {
  rollNumber: "",
  fullName: "",
  branch: "",
}
