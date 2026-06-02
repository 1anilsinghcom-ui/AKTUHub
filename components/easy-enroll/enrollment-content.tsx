"use client"

import { useState, useCallback, useRef } from "react"
import { FileStack, LayoutDashboard, List, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DocumentCard } from "./document-card"
import { EnrollmentActions } from "./enrollment-actions"
import { StudentForm } from "./student-form"
import { SummaryPanel } from "./summary-panel"
import { UploadZone } from "./upload-zone"
import { ScrollReveal } from "./scroll-reveal"
import { VerificationDashboard } from "./verification-dashboard"
import { PipelineProgressBar } from "./pipeline-progress-bar"
import { useProcessingPipeline, type ProcessedDoc, type ProcessingProgress } from "./processing-pipeline"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { DocItem, StudentInfo } from "./types"

interface EnrollmentContentProps {
  student: StudentInfo
  items: DocItem[]
  downloading: boolean
  canDownload: boolean
  downloadableCount: number
  pendingCount: number
  criticalIssues: string[]
  onStudentChange: (patch: Partial<StudentInfo>) => void
  onFiles: (files: File[]) => void
  onRejected: (message: string) => void
  onChangeType: (id: string, docKey: string) => void
  onRemove: (id: string) => void
  onDownload: () => void
  onDownloadOne: (id: string) => void
  onReset: () => void
}

type ViewMode = "list" | "dashboard"

export function EnrollmentContent({
  student,
  items,
  downloading,
  canDownload,
  downloadableCount,
  pendingCount,
  criticalIssues,
  onStudentChange,
  onFiles,
  onRejected,
  onChangeType,
  onRemove,
  onDownload,
  onDownloadOne,
  onReset,
}: EnrollmentContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [processedDocs, setProcessedDocs] = useState<ProcessedDoc[]>([])
  const [pipelineProgress, setPipelineProgress] = useState<ProcessingProgress | null>(null)
  const usedKeysRef = useRef(new Set<string>())

  const { runPipeline, isRunning } = useProcessingPipeline()

  // ── Handle new files: run through the new pipeline AND the existing engine ──
  const handleFiles = useCallback(
    (files: File[]) => {
      // 1. Feed through the existing DocItem engine (unchanged, backward compat)
      onFiles(files)

      // 2. Also run through the new smart pipeline → populates VerificationDashboard
      const currentUsedKeys = new Set(usedKeysRef.current)

      runPipeline(
        files,
        currentUsedKeys,
        student.rollNumber,
        (doc) => {
          // Update used keys
          usedKeysRef.current.add(doc.docKey)
          setProcessedDocs((prev) => [...prev, doc])
        },
        () => {
          setPipelineProgress(null)
          if (files.length > 0) {
            toast.success(`${files.length} file(s) processed. Switch to Dashboard view to review.`)
          }
        },
        (progress) => {
          setPipelineProgress(progress)
        },
      )
    },
    [onFiles, runPipeline, student.rollNumber],
  )

  // ── Reset: clear processed docs too ────────────────────────────────────────
  const handleReset = useCallback(() => {
    setProcessedDocs([])
    setPipelineProgress(null)
    usedKeysRef.current = new Set()
    onReset()
  }, [onReset])

  return (
    <section className="space-y-6">
      {/* Header */}
      <ScrollReveal animation="fade-down" delay={50} duration={600}>
        <div className="frost-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Enrollment Tool</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Enrollment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Drop everything here – Photos, PDFs, Scans, Combined Files
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              {(items.length > 0 || processedDocs.length > 0) && (
                <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                  <button
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all",
                      viewMode === "list"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-white",
                    )}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <List className="size-3.5" />
                    List
                  </button>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all",
                      viewMode === "dashboard"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-white",
                    )}
                    onClick={() => setViewMode("dashboard")}
                    aria-label="Dashboard view"
                  >
                    <LayoutDashboard className="size-3.5" />
                    Dashboard
                    {processedDocs.length > 0 && (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-black">
                        {processedDocs.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              <EnrollmentActions onReset={handleReset} />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Processing progress bar */}
      {(isRunning || pipelineProgress) && pipelineProgress && (
        <ScrollReveal animation="fade-up" delay={0} duration={400}>
          <PipelineProgressBar progress={pipelineProgress} />
        </ScrollReveal>
      )}

      {/* Dashboard view */}
      {viewMode === "dashboard" ? (
        <ScrollReveal animation="fade-up" delay={100} duration={600}>
        <div className="frost-card rounded-2xl p-5">
            <div className="mb-5 flex items-center gap-3">
              <LayoutDashboard className="size-5 text-purple-400" aria-hidden="true" />
              <h3 className="text-lg font-black text-white">Verification Dashboard</h3>
              {processedDocs.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="mr-1 inline size-3" />
                  {processedDocs.length} processed
                </span>
              )}
            </div>

            {processedDocs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <LayoutDashboard className="size-10 text-slate-700" aria-hidden="true" />
                <p className="text-sm text-slate-500">
                  Upload files first, then switch here to review the auto-classified slots.
                </p>
              </div>
            ) : (
              <VerificationDashboard
                docs={processedDocs}
                enrollmentNumber={student.rollNumber}
                studentName={student.fullName}
              />
            )}
          </div>
        </ScrollReveal>
      ) : (
        /* List view (original) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <ScrollReveal animation="fade-up" delay={150} duration={700} className="space-y-6">
            <StudentForm student={student} onChange={onStudentChange} />

            <Card className="frost-card border-0 shadow-xl shadow-blue-950/10">
              <CardContent className="space-y-4 pt-6">
                <UploadZone onFiles={handleFiles} onRejected={onRejected} />

                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <FileStack className="size-8 text-muted-foreground/60" aria-hidden="true" />
                    No documents yet. Drop a student's files above to begin.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">
                        Documents ({items.length})
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        Pick the correct type for each file
                      </span>
                    </div>
                    {items.map((it) => (
                      <DocumentCard
                        key={it.id}
                        item={it}
                        rollNumber={student.rollNumber}
                        onChangeType={onChangeType}
                        onRemove={onRemove}
                        onDownload={onDownloadOne}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal animation="fade-left" delay={250} duration={700} className="lg:sticky lg:top-24 lg:self-start">
            <aside>
              <SummaryPanel
                items={items}
                onDownload={onDownload}
                downloading={downloading}
                canDownload={canDownload}
                downloadableCount={downloadableCount}
                pendingCount={pendingCount}
                criticalIssues={criticalIssues}
              />
            </aside>
          </ScrollReveal>
        </div>
      )}
    </section>
  )
}
