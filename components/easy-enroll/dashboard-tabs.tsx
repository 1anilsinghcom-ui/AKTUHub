"use client"

import {
  BookOpen,
  Calculator,
  FileCheck2,
  Info,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type DashboardTab = "enrollment" | "study" | "faculty" | "utilities" | "about"

interface TabConfig {
  id: DashboardTab
  title: string
  description: string
  icon: LucideIcon
}

const tabs: TabConfig[] = [
  {
    id: "enrollment",
    title: "Enrollment",
    description: "Process AKTU enrollment documents",
    icon: FileCheck2,
  },
  {
    id: "study",
    title: "Study Hub",
    description: "Notes, PYQs, materials, syllabus",
    icon: BookOpen,
  },
  {
    id: "faculty",
    title: "Faculty Tools",
    description: "Management and analytics tools",
    icon: LayoutDashboard,
  },
  {
    id: "utilities",
    title: "Utilities",
    description: "Calculators, geo-tag and file tools",
    icon: Calculator,
  },
  {
    id: "about",
    title: "About",
    description: "Mission, vision and roadmap",
    icon: Info,
  },
]

interface DashboardTabsProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:pt-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {tabs.map((tab) => (
          <TabCard
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>
    </section>
  )
}

interface TabCardProps {
  tab: TabConfig
  active: boolean
  onClick: () => void
}

export function TabCard({ tab, active, onClick }: TabCardProps) {
  const Icon = tab.icon

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative min-h-32 overflow-hidden rounded-xl border p-5 text-left transition-all duration-300",
        "bg-white/[0.035] shadow-sm shadow-blue-950/20 hover:-translate-y-1 hover:border-cyan-300/45 hover:bg-white/[0.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
        active
          ? "scale-[1.02] border-cyan-300/80 bg-cyan-400/10 shadow-[0_0_34px_rgba(56,189,248,0.24)]"
          : "border-white/10",
      )}
    >
      <span
        className={cn(
          "absolute inset-x-5 top-0 h-0.5 origin-left rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-75",
        )}
      />
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.10),transparent_42%,rgba(139,92,246,0.08))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex h-full flex-col justify-between gap-5">
        <span className="flex size-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-bold text-white">{tab.title}</span>
          <span className="mt-1 block text-sm leading-5 text-slate-400">{tab.description}</span>
        </span>
      </span>
    </button>
  )
}
