"use client"

import { CheckCircle2, FileStack, Gauge, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { DOC_SPECS } from "@/lib/aktu"
import type { DocItem } from "./types"

interface Props { items: DocItem[] }

export function StatsCards({ items }: Props) {
  const total        = items.length
  const ready        = items.filter((i) => i.status === "ok").length
  const needsCheck   = items.filter((i) => i.status === "flagged").length
  const requiredSpecs = DOC_SPECS.filter((s) => s.required)
  const processedKeys = new Set(
    items.filter((i) => i.status === "ok" || i.status === "flagged").map((i) => i.docKey),
  )
  const mandatoryDone = requiredSpecs.filter((s) => processedKeys.has(s.key)).length

  const stats = [
    { label: "Total Files",   value: total,                            icon: FileStack,     tint: "text-purple-400",  ring: "bg-purple-500/15",  glow: "rgba(168,85,247,0.25)"  },
    { label: "Ready",         value: ready,                            icon: CheckCircle2,  tint: "text-emerald-400", ring: "bg-emerald-500/15", glow: "rgba(16,185,129,0.25)"  },
    { label: "Needs Check",   value: needsCheck,                       icon: TriangleAlert, tint: "text-amber-400",   ring: "bg-amber-500/15",   glow: "rgba(245,158,11,0.25)"  },
    { label: "Mandatory",     value: `${mandatoryDone}/${requiredSpecs.length}`, icon: Gauge, tint: "text-indigo-400", ring: "bg-indigo-500/15", glow: "rgba(99,102,241,0.25)"  },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="stat-card animate-card-enter group relative overflow-hidden rounded-2xl border border-white/[0.07] p-4"
          style={{
            animationDelay: `${100 + i * 65}ms`,
            background: "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* inner glow on hover */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top left, ${s.glow} 0%, transparent 65%)` }}
          />
          {/* top shimmer line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 tracking-wide">{s.label}</span>
            <span className={cn(
              "flex size-8 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
              s.ring,
            )}
              style={{ boxShadow: `0 0 0 1px ${s.glow.replace('0.25', '0.12')}` }}
            >
              <s.icon className={cn("size-4 transition-transform duration-300 group-hover:scale-110", s.tint)} aria-hidden="true" />
            </span>
          </div>

          <p className="animate-num-pop relative mt-3 text-3xl font-black tracking-tight text-white tabular-nums"
            style={{ animationDelay: `${150 + i * 65}ms` }}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  )
}
