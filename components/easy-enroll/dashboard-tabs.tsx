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
        "bg-white/[0.015] backdrop-blur-md shadow-sm shadow-black/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-950/20 hover:border-purple-500/40 hover:bg-white/[0.035]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70",
        active
          ? "scale-[1.03] border-purple-400/80 bg-purple-500/[0.07] shadow-[0_0_34px_rgba(168,85,247,0.25)]"
          : "border-white/10 hover:scale-102",
      )}
    >
      <span
        className={cn(
          "absolute inset-x-5 top-0 h-0.5 origin-left rounded-full bg-gradient-to-r from-fuchsia-400 via-purple-500 to-indigo-500 transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-75",
        )}
      />
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),transparent_42%,rgba(99,102,241,0.06))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex h-full flex-col justify-between gap-5">
        <span className={cn(
          "flex size-10 items-center justify-center rounded-lg border text-purple-200 transition-all duration-300",
          active 
            ? "border-purple-400/40 bg-purple-400/20 shadow-lg shadow-purple-500/30"
            : "border-purple-400/20 bg-purple-400/10 group-hover:scale-110 group-hover:border-purple-400/50 group-hover:bg-purple-400/20 group-hover:shadow-lg group-hover:shadow-purple-500/30"
        )}>
          <Icon className="size-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-bold text-white transition-colors duration-300 group-hover:text-purple-200">{tab.title}</span>
          <span className="mt-1 block text-sm leading-5 text-slate-400 transition-colors duration-300 group-hover:text-slate-300">{tab.description}</span>
        </span>
      </span>
    </button>
  )
}
