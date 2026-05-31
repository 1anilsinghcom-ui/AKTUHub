"use client"

import { CheckCircle2, FileStack, Gauge, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { DOC_SPECS } from "@/lib/aktu"
import type { DocItem } from "./types"

interface Props {
  items: DocItem[]
}

export function StatsCards({ items }: Props) {
  const total = items.length
  const ready = items.filter((i) => i.status === "ok").length
  const needsCheck = items.filter((i) => i.status === "flagged").length

  const requiredSpecs = DOC_SPECS.filter((s) => s.required)
  const processedKeys = new Set(
    items.filter((i) => i.status === "ok" || i.status === "flagged").map((i) => i.docKey),
  )
  const mandatoryDone = requiredSpecs.filter((s) => processedKeys.has(s.key)).length

  const stats = [
    {
      label: "Total Files",
      value: total,
      icon: FileStack,
      tint: "text-primary",
      ring: "bg-primary/15",
    },
    {
      label: "Ready",
      value: ready,
      icon: CheckCircle2,
      tint: "text-success",
      ring: "bg-success/15",
    },
    {
      label: "Needs Check",
      value: needsCheck,
      icon: TriangleAlert,
      tint: "text-warning",
      ring: "bg-warning/15",
    },
    {
      label: "Mandatory",
      value: `${mandatoryDone}/${requiredSpecs.length}`,
      icon: Gauge,
      tint: "text-[#6c63ff]",
      ring: "bg-[#6c63ff]/15",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="lift animate-fade-up rounded-xl border border-border bg-card p-4"
          style={{ animationDelay: `${120 + i * 60}ms` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            <span className={cn("flex size-8 items-center justify-center rounded-lg", s.ring)}>
              <s.icon className={cn("size-4", s.tint)} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  )
}
