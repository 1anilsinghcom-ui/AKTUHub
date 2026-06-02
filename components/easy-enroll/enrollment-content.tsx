"use client"

import { FileStack } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DocumentCard } from "./document-card"
import { EnrollmentActions } from "./enrollment-actions"
import { StudentForm } from "./student-form"
import { SummaryPanel } from "./summary-panel"
import { UploadZone } from "./upload-zone"
import { ScrollReveal } from "./scroll-reveal"
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
  return (
    <section className="space-y-6">
      <ScrollReveal animation="fade-down" delay={50} duration={600}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl shadow-blue-950/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Enrollment Tool</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Enrollment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Manage student enrollment documents
              </p>
            </div>
            <EnrollmentActions onReset={onReset} />
          </div>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <ScrollReveal animation="fade-up" delay={150} duration={700} className="space-y-6">
          <StudentForm student={student} onChange={onStudentChange} />

          <Card className="border-white/10 bg-card/90 shadow-xl shadow-blue-950/10">
            <CardContent className="space-y-4 pt-6">
              <UploadZone onFiles={onFiles} onRejected={onRejected} />

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
    </section>
  )
}
