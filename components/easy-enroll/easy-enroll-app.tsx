"use client"

import { useCallback, useState, lazy, Suspense } from "react"
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
import { AppHeader } from "./app-header"
import { DashboardTabs, type DashboardTab } from "./dashboard-tabs"
import { EnrollmentContent } from "./enrollment-content"
import { Footer } from "./footer"
import { AppThemeProvider, useAppTheme } from "./theme-context"
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

// Lazy-load non-critical tabs — smaller initial bundle, faster first paint
const AboutContent = lazy(() => import("./about-content").then(m => ({ default: m.AboutContent })))
const FacultyAndUtilitiesContent = lazy(() => import("./placeholder-content").then(m => ({ default: m.FacultyAndUtilitiesContent })))

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-400" />
    </div>
  )
}

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
  return (
    <AppThemeProvider>
      <AKTUHubAppInner />
    </AppThemeProvider>
  )
}

function AKTUHubAppInner() {
  const { theme } = useAppTheme()
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
    if (activeTab === "tools") return (
      <Suspense fallback={<TabFallback />}>
        <FacultyAndUtilitiesContent />
      </Suspense>
    )
    if (activeTab === "about") return (
      <Suspense fallback={<TabFallback />}>
        <AboutContent />
      </Suspense>
    )

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
    <div
      data-theme={theme}
      className={`ui-polish min-h-screen ${theme === "light" ? "bg-app-light" : "bg-app"}`}
    >
      <Toaster position="top-center" richColors />
      <AppHeader />

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Deep purple-navy gradient background */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a0418_0%,#0d0825_35%,#100a2e_60%,#0c0620_100%)]" />

        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-32 right-10 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-[90px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        </div>

        {/* Fine grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.06)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40" />

        {/* Neon top border */}
        <div className="neon-line absolute top-0 inset-x-0" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-14">

          {/* Left — text block */}
          <div className="animate-fade-up max-w-3xl space-y-5">
            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-purple-200">
              <Sparkles className="sparkle-icon size-3.5 text-purple-300" aria-hidden="true" />
              AKTU Digital Ecosystem
            </div>

            {/* Main title */}
            <div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="hero-title-main">AKTUHub</span>
              </h1>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                <span className="hero-title-sub">Smart academic tools</span>
                <span className="block text-white/80 font-medium text-xl sm:text-2xl lg:text-3xl mt-1">in one place.</span>
              </h2>
            </div>

            {/* Description */}
            <p className="max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              Smart solutions for{" "}
              <span className="font-semibold text-purple-300">AKTU students</span> &{" "}
              <span className="font-semibold text-indigo-300">faculty</span>. Enrollment,
              document processing, notes, PYQs, calculators, geo-tag tools, and
              AI-powered services — all in one dashboard.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {["Enrollment Docs", "PDF Processing", "OCR Classification", "ZIP Export"].map((f, i) => (
                <span
                  key={f}
                  className="animate-card-enter rounded-full border border-purple-500/20 bg-purple-500/8 px-3 py-1 text-xs font-semibold text-purple-200 backdrop-blur-sm transition-all duration-300 hover:border-purple-400/40 hover:bg-purple-500/15 hover:scale-105"
                  style={{ animationDelay: `${0.3 + i * 0.07}s` }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Right — 3D logo card */}
          <div className="animate-fade-up lg:justify-self-end card-3d-wrap" style={{ animationDelay: "120ms" }}>
            <div className="card-3d group relative mx-auto max-w-[290px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-4 shadow-[0_30px_80px_rgba(88,28,220,0.25)]">
              {/* inner glow gradients */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/12 via-transparent to-indigo-500/10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-3xl" />
              <div className="neon-line absolute inset-x-6 top-0" />

              <div className="card-3d-inner relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/aktuhub-logo.png"
                  alt="AKTUHub official logo"
                  className="aspect-square w-full rounded-2xl object-cover transition-all duration-500 group-hover:scale-[1.04] group-hover:brightness-110 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                />
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-[10px] font-bold tracking-tight text-slate-300">
                  {([
                    { icon: GraduationCap, label: "Students", color: "purple" },
                    { icon: BriefcaseBusiness, label: "Faculty", color: "indigo" },
                    { icon: MapPin, label: "Geo Tools", color: "violet" },
                  ] as const).map(({ icon: Icon, label, color }) => (
                    <span
                      key={label}
                      className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.04] px-1.5 py-2 transition-all duration-300 hover:scale-105 backdrop-blur-md
                        hover:border-${color}-400/50 hover:bg-${color}-500/15 hover:text-${color}-200`}
                    >
                      <Icon className={`size-3 text-${color}-300`} aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </div>
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
