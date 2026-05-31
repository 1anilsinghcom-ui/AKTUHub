"use client"

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FileArchive,
  FileBox,
  FileImage,
  FileText,
  FolderOpen,
  GraduationCap,
  Image,
  Library,
  LineChart,
  MapPin,
  Megaphone,
  NotebookTabs,
  PanelsTopLeft,
  Percent,
  Sigma,
  UserCog,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react"

interface FeatureItem {
  title: string
  icon: LucideIcon
  description?: string
  features?: string[]
  actionLabel?: string
}

const studyItems: FeatureItem[] = [
  { title: "Notes", icon: NotebookTabs },
  { title: "Previous Year Questions (PYQ)", icon: Library },
  { title: "Study Materials", icon: BookOpen },
  { title: "Semester Resources", icon: FolderOpen },
  { title: "Important Notices", icon: Megaphone },
  { title: "Syllabus", icon: FileText },
]

const facultyItems: FeatureItem[] = [
  { title: "Attendance Tools", icon: CalendarCheck },
  { title: "Student Management", icon: UserCog },
  { title: "Result Analysis", icon: BarChart3 },
  { title: "Reports & Analytics", icon: LineChart },
  { title: "Internal Assessment", icon: ClipboardCheck },
  { title: "Faculty Resources", icon: GraduationCap },
]

const utilityItems: FeatureItem[] = [
  { title: "GPA Calculator", icon: Percent },
  { title: "CGPA Calculator", icon: Sigma },
  { title: "Geo Tag Photo Editor", icon: MapPin },
  { title: "Video Geo Tag Editor", icon: Video },
  { title: "PDF Tools", icon: FileText },
  { title: "Image Compressor", icon: Image },
  {
    title: "All-in-One File Compressor",
    icon: FileBox,
    description:
      "Compress images, PDFs, and documents into optimized formats while maintaining quality.",
    features: [
      "Image Compression",
      "PDF Compression",
      "Batch Compression",
      "Multiple Format Support",
      "Fast Processing",
    ],
    actionLabel: "Open Tool",
  },
  { title: "File Converter", icon: FileArchive },
  { title: "Other Utilities", icon: Wrench },
]

export function StudyHubContent() {
  return (
    <FeatureSection
      eyebrow="Learning workspace"
      title="Study Hub"
      subtitle="Learning resources for AKTU students."
      items={studyItems}
    />
  )
}

export function FacultyContent() {
  return (
    <FeatureSection
      eyebrow="Faculty productivity"
      title="Faculty Tools"
      subtitle="Productivity and management tools for faculty members."
      items={facultyItems}
    />
  )
}

export function UtilitiesContent() {
  return (
    <FeatureSection
      eyebrow="Academic utilities"
      title="Utilities"
      subtitle="Helpful tools for AKTU students and faculty."
      items={utilityItems}
    />
  )
}

interface FeatureSectionProps {
  eyebrow: string
  title: string
  subtitle: string
  items: FeatureItem[]
}

function FeatureSection({ eyebrow, title, subtitle, items }: FeatureSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl shadow-blue-950/10 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">{subtitle}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-200">
          <PanelsTopLeft className="size-3.5" aria-hidden="true" />
          Roadmap module
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <FeatureCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ item }: { item: FeatureItem }) {
  const Icon = item.icon

  return (
    <article className="animate-fade-up group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e1729]/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:bg-[#111d34] hover:shadow-xl hover:shadow-cyan-950/20">
      <span className="absolute inset-x-5 top-0 h-px scale-x-0 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-transform duration-300 group-hover:scale-x-100" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-200">
          Coming Soon
        </span>
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {item.description ??
          "A focused AKTUHub module designed for fast access, clean workflows, and reliable academic productivity."}
      </p>
      {item.features?.length ? (
        <ul className="mt-4 space-y-2">
          {item.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span className="size-1.5 shrink-0 rounded-full bg-cyan-300" />
              {feature}
            </li>
          ))}
        </ul>
      ) : null}
      {item.actionLabel ? (
        <button
          type="button"
          className="mt-auto inline-flex h-9 w-fit items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100 transition-all duration-300 hover:border-cyan-200/60 hover:bg-cyan-300/20"
        >
          {item.actionLabel}
        </button>
      ) : null}
    </article>
  )
}
