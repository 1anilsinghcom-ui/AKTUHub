"use client"

import { useCallback, useState } from "react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import {
  BriefcaseBusiness,
  GraduationCap,
  MapPin,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { AboutContent } from "./about-content"
import { AppHeader } from "./app-header"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"
import { EnrollmentContent } from "./enrollment-content"
import { FacultyContent, StudyHubContent, UtilitiesContent } from "./placeholder-content"
import { Footer } from "./footer"
import { EMPTY_STUDENT, type DocItem, type StudentInfo } from "./types"
import {
  DOC_SPECS,
  buildDownloadName,
  formatBytes,
  getSpec,
  sanitizeName,
} from "@/lib/aktu"
import {
  detectDocumentType,
  getCriticalIssues,
  getDownloadableItems,
} from "@/lib/enrollment-engine"
import { processDocument } from "@/lib/processing"

const PDF_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150"><rect width="120" height="150" rx="8" fill="#eef2f7"/><rect x="22" y="20" width="76" height="100" rx="4" fill="#fff" stroke="#cbd5e1"/><text x="60" y="78" font-family="sans-serif" font-size="20" font-weight="700" fill="#1e3a8a" text-anchor="middle">PDF</text></svg>`,
  )

let idCounter = 0
const nextId = () => `doc-${Date.now()}-${idCounter++}`

function isImageFile(file: File) {
  return file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".pdf")
}

function resolveOutputName(item: DocItem, student: StudentInfo) {
  if (!item.result) return "processed.bin"
  const key = item.result.suggestedDocKey ?? item.docKey
  return buildDownloadName(student.rollNumber, key, item.result.ext, item.file.name)
}

export function AKTUHubApp() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("enrollment")
  const [student, setStudent] = useState<StudentInfo>(EMPTY_STUDENT)
  const [items, setItems] = useState<DocItem[]>([])
  const [downloading, setDownloading] = useState(false)

  const patchStudent = (patch: Partial<StudentInfo>) =>
    setStudent((s) => ({ ...s, ...patch }))

  const runProcess = useCallback(async (id: string, file: File, docKey: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "processing", error: undefined } : it)),
    )
    try {
      const result = await processDocument(file, getSpec(docKey))
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it
          const nextKey =
            result.suggestedDocKey &&
            result.suggestedDocKey !== it.docKey &&
            (result.ocrClassification?.confidence ?? 0) >= 60
              ? result.suggestedDocKey
              : it.docKey
          const detectionReason = result.ocrClassification
            ? `OCR: ${result.ocrClassification.type} (${result.ocrClassification.confidence}% confidence)`
            : it.detectionReason
          return {
            ...it,
            docKey: nextKey,
            status: result.status,
            result,
            detectionConfidence: result.ocrClassification?.confidence ?? it.detectionConfidence,
            detectionReason,
          }
        }),
      )
    } catch (err) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "error",
                error:
                  err instanceof Error
                    ? err.message
                    : "Could not process this file. HEIC files may need conversion first.",
              }
            : it,
        ),
      )
    }
  }, [])

  const handleFiles = useCallback(
    (files: File[]) => {
      setItems((prev) => {
        const existingNames = new Set(prev.map((i) => i.file.name + i.file.size))
        const additions: DocItem[] = []
        let working = [...prev]
        for (const file of files) {
          if (existingNames.has(file.name + file.size)) {
            toast.warning(`"${file.name}" looks like a duplicate and was skipped.`)
            continue
          }
          const detection = detectDocumentType(file, new Set(working.map((i) => i.docKey)))
          const docKey = detection.docKey
          const item: DocItem = {
            id: nextId(),
            file,
            docKey,
            status: "queued",
            originalSize: file.size,
            detectionConfidence: detection.confidence,
            detectionReason: detection.reason,
            originalPreviewUrl: isImageFile(file)
              ? URL.createObjectURL(file)
              : PDF_PLACEHOLDER,
          }
          additions.push(item)
          working = [...working, item]
        }
        additions.forEach((it) => void runProcess(it.id, it.file, it.docKey))
        return [...prev, ...additions]
      })
    },
    [runProcess],
  )

  const handleChangeType = useCallback(
    (id: string, docKey: string) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, docKey, status: "queued", result: undefined } : it)),
      )
      const item = items.find((i) => i.id === id)
      if (item) void runProcess(id, item.file, docKey)
    },
    [items, runProcess],
  )

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target?.originalPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(target.originalPreviewUrl)
      if (target?.result?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(target.result.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const handleReset = useCallback(() => {
    items.forEach((it) => {
      if (it.originalPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(it.originalPreviewUrl)
      if (it.result?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(it.result.previewUrl)
    })
    setItems([])
    setStudent(EMPTY_STUDENT)
    toast.success("Cleared. Ready for the next student.")
  }, [items])

  const downloadableItems = getDownloadableItems(items)
  const criticalIssues = getCriticalIssues(items)
  const pendingCount = items.filter((i) => i.status === "queued" || i.status === "processing").length
  const canDownload = downloadableItems.length > 0

  const downloadItems = useCallback(
    async (targets: DocItem[]) => {
      if (!targets.length) return
      setDownloading(true)
      try {
        if (targets.length === 1) {
          const item = targets[0]
          if (!item.result) return
          const name = resolveOutputName(item, student)
          saveAs(item.result.blob, name)
          toast.success(`Downloaded ${name}`)
          return
        }

        const studentLabel = student.rollNumber.trim() || sanitizeName(student.fullName) || "processed"
        const zip = new JSZip()
        const lines: string[] = []
        lines.push("AKTUHub - Processed Documents")
        lines.push("====================================")
        lines.push(`Roll Number : ${student.rollNumber || "(not provided)"}`)
        lines.push(`Name        : ${student.fullName || "(not provided)"}`)
        lines.push(`Branch      : ${student.branch || "(not provided)"}`)
        lines.push("")
        lines.push("Included files:")

        const usedNames = new Set<string>()
        for (const it of targets) {
          if (!it.result) continue
          let name = resolveOutputName(it, student)
          let n = 2
          while (usedNames.has(name)) {
            const key = it.result.suggestedDocKey ?? it.docKey
            name = buildDownloadName(student.rollNumber, `${key}-${n}`, it.result.ext, it.file.name)
            n++
          }
          usedNames.add(name)
          zip.file(name, it.result.blob)
          lines.push(
            `  - ${name} (${formatBytes(it.result.size)})${it.result.flags.length ? " [review warnings]" : ""}`,
          )
          if (it.result.autoFixes.length) {
            lines.push(`      Auto-fixed: ${it.result.autoFixes.join("; ")}`)
          }
        }

        lines.push("")
        lines.push(`Generated: ${new Date().toLocaleString()}`)
        zip.file("summary.txt", lines.join("\n"))

        const blob = await zip.generateAsync({ type: "blob" })
        const zipName = `${studentLabel}_documents.zip`
        saveAs(blob, zipName)
        toast.success(`Downloaded ${zipName} (${targets.length} files)`)
      } catch (err) {
        toast.error("Could not prepare download. Please try again.")
        console.error("[AKTUHub] download error:", err)
      } finally {
        setDownloading(false)
      }
    },
    [student],
  )

  const handleDownload = useCallback(async () => {
    await downloadItems(downloadableItems)
  }, [downloadItems, downloadableItems])

  const handleDownloadOne = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id)
      if (!item?.result || (item.status !== "ok" && item.status !== "flagged")) return
      await downloadItems([item])
    },
    [downloadItems, items],
  )

  const renderTabContent = () => {
    if (activeTab === "study") return <StudyHubContent />
    if (activeTab === "faculty") return <FacultyContent />
    if (activeTab === "utilities") return <UtilitiesContent />
    if (activeTab === "about") return <AboutContent />

    return (
      <EnrollmentContent
        student={student}
        items={items}
        downloading={downloading}
        canDownload={canDownload}
        downloadableCount={downloadableItems.length}
        pendingCount={pendingCount}
        criticalIssues={criticalIssues}
        onStudentChange={patchStudent}
        onFiles={handleFiles}
        onRejected={(m) => toast.error(m)}
        onChangeType={handleChangeType}
        onRemove={handleRemove}
        onDownload={handleDownload}
        onDownloadOne={handleDownloadOne}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="ui-polish min-h-screen bg-app">
      <Toaster position="top-center" richColors />
      <AppHeader />

      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#07111f_0%,#0b1530_48%,#11112c_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="animate-fade-up max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200 transition-all duration-300 hover:border-blue-300/50 hover:bg-blue-400/20 hover:shadow-lg hover:shadow-blue-500/20">
              <Sparkles className="size-3.5 animate-spin transition-transform duration-300" aria-hidden="true" />
              AKTU digital ecosystem
            </div>
            <h1 className="mt-5 text-balance text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl transition-all duration-500 hover:text-transparent hover:bg-gradient-to-r hover:from-sky-300 hover:via-blue-400 hover:to-violet-400 hover:bg-clip-text">
              AKTUHub
              <span className="block bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                smart academic tools in one place.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-slate-300 sm:text-lg transition-all duration-300 hover:text-slate-200">
              Smart Solutions for AKTU Students & Faculty. Start with enrollment and
              document processing today, then grow into notes, PYQs, dashboards,
              calculators, geo-tag tools, placements, and AI-powered student services.
            </p>
          </div>

          <div className="animate-fade-up lg:justify-self-end" style={{ animationDelay: "100ms" }}>
            <div className="group relative mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#030814] p-4 shadow-2xl shadow-blue-950/40 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/30 hover:border-blue-400/30">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/aktuhub-logo.png"
                alt="AKTUHub official logo"
                className="aspect-square w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-300">
                <span className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 transition-all duration-300 hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-200 hover:scale-105">
                  <GraduationCap className="size-3.5 text-blue-300 transition-transform duration-300" aria-hidden="true" />
                  Students
                </span>
                <span className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 transition-all duration-300 hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-200 hover:scale-105">
                  <BriefcaseBusiness className="size-3.5 text-violet-300 transition-transform duration-300" aria-hidden="true" />
                  Faculty
                </span>
                <span className="flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 transition-all duration-300 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-200 hover:scale-105">
                  <MapPin className="size-3.5 text-cyan-300 transition-transform duration-300" aria-hidden="true" />
                  Geo Tools
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div key={activeTab} className="animate-tab-enter">
          {renderTabContent()}
        </div>
      </main>

      <Footer onTabChange={setActiveTab} />
    </div>
  )
}
