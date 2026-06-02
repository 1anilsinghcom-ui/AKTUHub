"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import {
  BookOpen,
  Download,
  Eye,
  FileText,
  Library,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  addStudyResource,
  canPreviewStudy,
  deleteStudyResource,
  formatStudySize,
  getStudyResource,
  listStudyResources,
  STUDY_MAX_BYTES,
  studyResourceToBlob,
  type StudyCategory,
  type StudyResourceMeta,
} from "@/lib/study-hub-storage"
import { ScrollReveal } from "./scroll-reveal"

const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/*": [".jpg", ".jpeg", ".png", ".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
}

export function StudyHubContent() {
  const [category, setCategory] = useState<StudyCategory>("notes")
  const [resources, setResources] = useState<StudyResourceMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [semester, setSemester] = useState("")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMime, setPreviewMime] = useState("")
  const [previewName, setPreviewName] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadResources = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listStudyResources(category)
      setResources(list)
    } catch {
      toast.error("Could not load study files.")
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    loadResources()
  }, [loadResources])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return resources
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.semester.toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q),
    )
  }, [resources, search])

  const onUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setUploading(true)
      try {
        for (const file of files) {
          await addStudyResource({
            file,
            title: title || file.name,
            category,
            subject,
            semester,
          })
        }
        toast.success(files.length === 1 ? "File uploaded." : `${files.length} files uploaded.`)
        setTitle("")
        await loadResources()
      } catch {
        toast.error("Upload failed. Try a smaller file or refresh the page.")
      } finally {
        setUploading(false)
      }
    },
    [category, loadResources, semester, subject, title],
  )

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        const code = rejections[0]?.errors[0]?.code
        if (code === "file-too-large") toast.error("File too large — maximum 25 MB per file.")
        else toast.error("Unsupported file type.")
        return
      }
      void onUpload(accepted)
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    maxSize: STUDY_MAX_BYTES,
    accept: ACCEPT,
  })

  const handleDownload = async (id: string) => {
    try {
      const resource = await getStudyResource(id)
      if (!resource) {
        toast.error("File not found.")
        return
      }
      const blob = studyResourceToBlob(resource)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = resource.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Download failed.")
    }
  }

  const handlePreview = async (meta: StudyResourceMeta) => {
    if (!canPreviewStudy(meta.mimeType, meta.fileName)) {
      toast.message("Preview not available for this format. Download to open it.")
      return
    }
    setPreviewId(meta.id)
    setPreviewLoading(true)
    setPreviewUrl(null)
    setPreviewMime(meta.mimeType)
    setPreviewName(meta.title)
    try {
      const resource = await getStudyResource(meta.id)
      if (!resource) {
        toast.error("File not found.")
        setPreviewId(null)
        return
      }
      const blob = studyResourceToBlob(resource)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      toast.error("Could not open preview.")
      setPreviewId(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = (open: boolean) => {
    if (!open) {
      setPreviewId(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteStudyResource(id)
      toast.success("File removed.")
      if (previewId === id) closePreview(false)
      await loadResources()
    } catch {
      toast.error("Could not delete file.")
    }
  }

  return (
    <section className="space-y-6">
      <ScrollReveal animation="fade-down" delay={50} duration={600}>
        <div className="rounded-2xl glass-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-purple-300">Learning workspace</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Study Hub</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Upload notes and PYQs, preview in the browser, and download anytime.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
              <BookOpen className="size-3.5" aria-hidden="true" />
              Available Now
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal animation="fade-up" delay={150} duration={700}>
        <Tabs
          value={category}
          onValueChange={(v) => setCategory(v as StudyCategory)}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/[0.015] border border-white/10">
            <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-200">
              <FileText className="size-4" aria-hidden="true" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="pyq" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-200">
              <Library className="size-4" aria-hidden="true" />
              PYQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value={category} className="mt-0 space-y-6">
            <Card className="glass-panel">
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="study-title" className="text-xs font-bold uppercase tracking-wide text-slate-300">Title</Label>
                    <Input
                      id="study-title"
                      placeholder={category === "notes" ? "Unit 3 – OS Notes" : "2024 End Sem PYQ"}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="study-subject" className="text-xs font-bold uppercase tracking-wide text-slate-300">Subject</Label>
                    <Input
                      id="study-subject"
                      placeholder="e.g. Data Structures"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="study-semester" className="text-xs font-bold uppercase tracking-wide text-slate-300">Semester</Label>
                    <Select value={semester || "any"} onValueChange={(v) => setSemester(v === "any" ? "" : v)}>
                      <SelectTrigger id="study-semester" className="glass-input">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any semester</SelectItem>
                        {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                          <SelectItem key={s} value={s}>
                            Semester {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div
                  {...getRootProps()}
                  className={cn(
                    "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all",
                    "border-purple-500/30 bg-purple-500/[0.04] ring-1 ring-purple-400/15 hover:border-purple-400 hover:bg-purple-500/[0.08]",
                    isDragActive && "border-purple-400 bg-purple-500/10",
                    uploading && "pointer-events-none opacity-60",
                  )}
                  role="button"
                  aria-label={`Upload ${category === "notes" ? "notes" : "PYQ files"}`}
                >
                  <input {...getInputProps()} />
                  {uploading ? (
                    <Loader2 className="size-10 animate-spin text-purple-300" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="size-10 text-purple-300" aria-hidden="true" />
                  )}
                  <p className="text-sm font-semibold text-white">
                    {isDragActive
                      ? "Drop files here"
                      : `Upload ${category === "notes" ? "notes" : "PYQs"} — drag & drop or click`}
                  </p>
                  <p className="text-xs text-purple-200/60">
                    PDF, images, Word, PPT · up to 25 MB each · saved on this device
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold text-white">
                {category === "notes" ? "Notes library" : "PYQ library"}
                <span className="ml-2 text-sm font-medium text-slate-400">({filtered.length})</span>
              </h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <Input
                  className="pl-9 glass-input"
                  placeholder="Search title, subject…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Loading files…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-14 text-center text-sm text-slate-400">
                No {category === "notes" ? "notes" : "PYQs"} yet. Upload your first file above.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filtered.map((item) => (
                  <StudyResourceCard
                    key={item.id}
                    item={item}
                    onPreview={() => handlePreview(item)}
                    onDownload={() => handleDownload(item.id)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollReveal>

      <Dialog open={!!previewId} onOpenChange={closePreview}>
        <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
            <DialogDescription>Preview without downloading</DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto rounded-lg border border-white/10 bg-black/40">
            {previewLoading ? (
              <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Opening preview…
              </div>
            ) : previewUrl && previewMime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={previewName} className="mx-auto max-h-[72vh] w-auto object-contain p-4" />
            ) : previewUrl ? (
              <iframe
                title={previewName}
                src={previewUrl}
                className="h-[72vh] w-full"
              />
            ) : null}
          </div>
          {previewId ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => previewId && handleDownload(previewId)}>
                <Download className="size-4" aria-hidden="true" />
                Download
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function StudyResourceCard({
  item,
  onPreview,
  onDownload,
  onDelete,
}: {
  item: StudyResourceMeta
  onPreview: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const Icon = item.category === "pyq" ? Library : FileText
 
  return (
    <article className="lift flex flex-col gap-4 rounded-xl glass-panel p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-200">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-bold text-white">{item.title}</h4>
          <p className="mt-0.5 truncate text-xs text-slate-400">{item.fileName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {[item.subject, item.semester && `Sem ${item.semester}`, formatStudySize(item.size)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col lg:flex-row">
        <Button type="button" size="sm" variant="secondary" className="bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white" onClick={onPreview}>
          <Eye className="size-4" aria-hidden="true" />
          Preview
        </Button>
        <Button type="button" size="sm" className="btn-glossy font-bold" onClick={onDownload}>
          <Download className="size-4" aria-hidden="true" />
          Download
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10" onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </article>
  )
}
