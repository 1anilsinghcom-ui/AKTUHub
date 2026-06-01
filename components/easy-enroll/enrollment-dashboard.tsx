"use client"

import { Activity, AlertTriangle, CheckCircle2, Clock, FileStack, XCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { getEngineStats, getReadinessScores } from "@/lib/enrollment-engine"
import type { DocItem } from "./types"

export function EnrollmentDashboard({ items }: { items: DocItem[] }) {
  const stats = getEngineStats(items)
  const scores = getReadinessScores(items)

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl shadow-blue-950/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Enrollment Readiness Engine</p>
            <h3 className="mt-2 text-2xl font-black text-white">{scores.overall}% Enrollment Ready</h3>
          </div>
          <span className={statusClass(scores.status)}>{scores.status}</span>
        </div>

        <div className="mt-5 space-y-4">
          <Progress value={scores.overall} className="h-2.5" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Score label="Photo" value={scores.photo} />
            <Score label="Signature" value={scores.signature} />
            <Score label="Thumb" value={scores.thumb} />
            <Score label="Documents" value={scores.documents} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
        <Metric icon={FileStack} label="Total Files" value={stats.totalFiles} />
        <Metric icon={CheckCircle2} label="Ready" value={stats.readyFiles} />
        <Metric icon={AlertTriangle} label="Warnings" value={stats.warningFiles} />
        <Metric icon={XCircle} label="Failed" value={stats.failedFiles} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 xl:col-span-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Activity className="size-4 text-cyan-300" aria-hidden="true" />
          Processing Statistics
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatLine label="Required documents" value={`${stats.requiredComplete}/${stats.requiredTotal}`} />
          <StatLine label="Pending files" value={String(stats.pendingFiles)} />
          <StatLine label="Recent activity" value={items[0] ? "Files analyzed in this session" : "Waiting for upload"} />
        </div>
      </div>
    </section>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1729]/80 p-3 transition-all duration-300 hover:border-cyan-300/40 hover:bg-[#0e1729] hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-105">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-400 transition-colors duration-300 group-hover:text-slate-300">{label}</span>
        <span className="font-black text-white transition-colors duration-300 group-hover:text-cyan-200">{value}%</span>
      </div>
      <Progress value={value} className="mt-2 h-1.5" />
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e1729]/80 p-4 transition-all duration-300 hover:border-cyan-300/50 hover:bg-[#0e1729] hover:shadow-xl hover:shadow-cyan-500/20 hover:scale-105">
      <Icon className="size-4 text-cyan-300 transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
      <p className="mt-3 text-2xl font-black text-white transition-colors duration-300 group-hover:text-cyan-200">{value}</p>
      <p className="text-xs font-semibold text-slate-400 transition-colors duration-300 group-hover:text-slate-300">{label}</p>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 transition-all duration-300 hover:border-cyan-300/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-cyan-500/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors duration-300 group-hover:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-200 transition-colors duration-300 group-hover:text-slate-100">{value}</p>
    </div>
  )
}

function statusClass(status: string) {
  const baseClass = "w-fit rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:scale-105"
  if (status === "Ready") return `${baseClass} border border-emerald-300/25 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-400/20 hover:shadow-lg hover:shadow-emerald-500/20`
  if (status === "Needs Review") return `${baseClass} border border-amber-300/25 bg-amber-400/10 text-amber-200 hover:border-amber-300/60 hover:bg-amber-400/20 hover:shadow-lg hover:shadow-amber-500/20`
  return `${baseClass} border border-red-300/25 bg-red-400/10 text-red-200 hover:border-red-300/60 hover:bg-red-400/20 hover:shadow-lg hover:shadow-red-500/20`
}
