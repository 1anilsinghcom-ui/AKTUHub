export type StudyCategory = "notes" | "pyq"

export interface StudyResource {
  id: string
  title: string
  category: StudyCategory
  subject: string
  semester: string
  fileName: string
  mimeType: string
  size: number
  uploadedAt: number
  data: ArrayBuffer
}

export type StudyResourceMeta = Omit<StudyResource, "data">

export const STUDY_MAX_BYTES = 25 * 1024 * 1024

const DB_NAME = "aktuhub-study-hub"
const DB_VERSION = 1
const STORE = "resources"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error("Failed to open study storage"))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
  })
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const request = fn(store)
        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => reject(request.error ?? new Error("Study storage request failed"))
        tx.oncomplete = () => db.close()
        tx.onerror = () => reject(tx.error ?? new Error("Study storage transaction failed"))
      }),
  )
}

export async function listStudyResources(category?: StudyCategory): Promise<StudyResourceMeta[]> {
  const all = await withStore<StudyResource[]>("readonly", (store) => store.getAll())
  const sorted = all.sort((a, b) => b.uploadedAt - a.uploadedAt)
  const filtered = category ? sorted.filter((r) => r.category === category) : sorted
  return filtered.map(({ data: _data, ...meta }) => meta)
}

export async function getStudyResource(id: string): Promise<StudyResource | undefined> {
  return withStore<StudyResource | undefined>("readonly", (store) => store.get(id))
}

export async function addStudyResource(input: {
  file: File
  title: string
  category: StudyCategory
  subject: string
  semester: string
}): Promise<StudyResourceMeta> {
  const data = await input.file.arrayBuffer()
  const resource: StudyResource = {
    id: `study-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title.trim() || input.file.name.replace(/\.[^.]+$/, ""),
    category: input.category,
    subject: input.subject.trim(),
    semester: input.semester.trim(),
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    uploadedAt: Date.now(),
    data,
  }
  await withStore<IDBValidKey>("readwrite", (store) => store.put(resource))
  const { data: _data, ...meta } = resource
  return meta
}

export async function deleteStudyResource(id: string): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(id))
}

export function studyResourceToBlob(resource: StudyResource): Blob {
  return new Blob([resource.data], { type: resource.mimeType })
}

export function formatStudySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function canPreviewStudy(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith("image/")) return true
  if (mimeType === "application/pdf") return true
  return /\.(pdf|jpe?g|png|webp|gif)$/i.test(fileName)
}
