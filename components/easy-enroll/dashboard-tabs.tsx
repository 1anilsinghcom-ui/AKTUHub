"use client"

import {
  Calculator,
  FileCheck2,
  Info,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type DashboardTab = "enrollment" | "tools" | "about"

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
    id: "tools",
    title: "Toolkit",
    description: "Calculators, compressor & utilities",
    icon: LayoutDashboard,
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        "group relative min-h-[130px] overflow-hidden rounded-2xl border p-5 text-left",
        "transition-all duration-300 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70",
        // base glass
        "backdrop-blur-xl",
        active
          ? [
              "border-purple-400/50 bg-gradient-to-br from-purple-500/12 via-white/[0.025] to-indigo-500/8",
              "shadow-[0_0_40px_rgba(168,85,247,0.2),0_8px_32px_rgba(0,0,0,0.5)]",
              "scale-[1.03] -translate-y-0.5",
            ]
          : [
              "border-white/[0.07] bg-white/[0.015]",
              "hover:-translate-y-1.5 hover:scale-[1.02]",
              "hover:border-purple-400/30 hover:bg-white/[0.03]",
              "hover:shadow-[0_12px_40px_rgba(0,0,0,0.55),0_0_20px_rgba(139,92,246,0.1)]",
            ],
      )}
    >
      {/* top accent line — grows on active/hover */}
      <span
        className={cn(
          "absolute inset-x-4 top-0 h-[1.5px] origin-left rounded-full",
          "bg-gradient-to-r from-fuchsia-500 via-purple-400 to-indigo-500",
          "transition-transform duration-400",
          active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-70 group-hover:scale-x-80",
        )}
      />

      {/* frosted inner glow */}
      <span
        className={cn(
          "absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.1),transparent_65%)]",
          "opacity-0 transition-opacity duration-300",
          active ? "opacity-100" : "group-hover:opacity-80",
        )}
      />

      {/* bottom shimmer */}
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <span className="relative flex h-full flex-col justify-between gap-5">
        {/* Icon */}
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl border transition-all duration-300",
            active
              ? "border-purple-400/40 bg-purple-400/20 shadow-[0_0_16px_rgba(168,85,247,0.35)] text-purple-200"
              : "border-purple-400/15 bg-purple-400/8 text-purple-300 group-hover:scale-110 group-hover:border-purple-400/40 group-hover:bg-purple-400/18 group-hover:shadow-[0_0_14px_rgba(168,85,247,0.28)]",
          )}
        >
          <Icon
            className={cn(
              "size-[18px] transition-transform duration-300",
              active ? "text-purple-200" : "group-hover:rotate-6 group-hover:scale-110",
            )}
            aria-hidden="true"
          />
        </span>

        {/* Text */}
        <span>
          <span
            className={cn(
              "block text-base font-bold transition-colors duration-300",
              active ? "text-purple-100" : "text-white group-hover:text-purple-200",
            )}
          >
            {tab.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500 transition-colors duration-300 group-hover:text-slate-400">
            {tab.description}
          </span>
        </span>
      </span>
    </button>
  )
}
