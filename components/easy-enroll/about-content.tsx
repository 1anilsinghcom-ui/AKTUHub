"use client"

import {
  Bot,
  Compass,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MapPin,
  Target,
  UserRound,
  Video,
} from "lucide-react"

const roadmap = [
  { title: "Enrollment Tools", icon: FileCheck2 },
  { title: "Study Hub", icon: GraduationCap },
  { title: "Faculty Dashboard", icon: LayoutDashboard },
  { title: "Geo Tag Editor", icon: MapPin },
  { title: "Video Geo Tag Editor", icon: Video },
  { title: "AI Academic Assistant", icon: Bot },
]

const contactEmails = ["1anilsingh.com@gmail.com", "thelionhear.com@gmail.com"]

export function AboutContent() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl shadow-blue-950/10 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Platform profile</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">About AKTUHub</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
          Smart Solutions for AKTU Students & Faculty
        </p>

        <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <article className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0e1729]/85 p-6">
            <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
            <div className="flex size-16 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <UserRound className="size-8" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-2xl font-black text-white">Anil Singh</h3>
            <p className="mt-1 text-sm font-semibold text-cyan-200">Assistant Professor</p>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Building practical digital tools for students and faculty across the AKTU academic ecosystem.
            </p>
          </article>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <InfoPanel
              icon={Target}
              title="Mission"
              text="Building a unified platform that helps AKTU students and faculty access academic resources, enrollment tools, productivity utilities, and digital services from a single place."
            />
            <InfoPanel
              icon={Compass}
              title="Vision"
              text="To become the central digital ecosystem for AKTU students and faculty."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Platform roadmap</p>
          <h3 className="mt-2 text-2xl font-black text-white">Built for the next decade</h3>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {roadmap.map((item, index) => {
              const Icon = item.icon
              return (
                <article
                  key={item.title}
                  className="relative rounded-xl border border-white/10 bg-[#0e1729]/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/45 hover:bg-[#111d34]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-400/10 text-violet-200">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Phase {index + 1}
                      </p>
                      <h4 className="text-base font-bold text-white">{item.title}</h4>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-[#0e1729]/85 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Contact</p>
          <h3 className="mt-2 text-2xl font-black text-white">Get in touch</h3>
          <div className="mt-5 space-y-3 text-sm text-slate-300">
            {contactEmails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition-all duration-300 hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100"
              >
                <Mail className="size-4 shrink-0 text-cyan-300" aria-hidden="true" />
                <span className="break-all">{email}</span>
              </a>
            ))}
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <MapPin className="size-4 text-cyan-300" aria-hidden="true" />
              Uttar Pradesh, India
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

interface InfoPanelProps {
  icon: typeof Target
  title: string
  text: string
}

function InfoPanel({ icon: Icon, title, text }: InfoPanelProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#0e1729]/80 p-6">
      <div className="flex size-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
    </article>
  )
}
