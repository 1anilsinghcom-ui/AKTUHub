"use client"

import type { ReactNode } from "react"
import { Mail } from "lucide-react"
import type { DashboardTab } from "./dashboard-tabs"

interface FooterProps {
  onTabChange: (tab: DashboardTab) => void
}

const quickLinks: Array<{ label: string; tab: DashboardTab }> = [
  { label: "Enrollment", tab: "enrollment" },
  { label: "Toolkit", tab: "tools" },
  { label: "About", tab: "about" },
]

const futureServices = [
  "Notes",
  "PYQ",
  "GPA Tools",
  "Geo Tag Editor",
  "Video Geo Tag Editor",
]

const contactEmails = ["1anilsingh.com@gmail.com", "thelionhear.com@gmail.com"]

export function Footer({ onTabChange }: FooterProps) {
  return (
    <footer className="mt-10 border-t border-white/10 bg-[#040914]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.9fr_0.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-11 overflow-hidden rounded-lg border border-white/10 bg-[#050b18]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aktuhub-logo.png" alt="AKTUHub logo" className="size-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                AKTU<span className="bg-gradient-to-r from-blue-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">Hub</span>
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Smart Solutions for AKTU Students & Faculty
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
            An all-in-one digital ecosystem for enrollment, academic resources,
            faculty productivity, utilities, and future AI-powered services.
          </p>
        </div>

        <FooterGroup title="Quick Links">
          {quickLinks.map((link) => (
            <button
              key={link.tab}
              type="button"
              onClick={() => onTabChange(link.tab)}
              className="block text-left text-sm text-slate-400 transition-colors hover:text-cyan-200"
            >
              {link.label}
            </button>
          ))}
        </FooterGroup>

        <FooterGroup title="Future Services">
          {futureServices.map((service) => (
            <span key={service} className="block text-sm text-slate-400">
              {service}
            </span>
          ))}
        </FooterGroup>

        <FooterGroup title="Contact">
          {contactEmails.map((email) => (
            <a
              key={email}
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-cyan-200"
            >
              <Mail className="size-4 shrink-0 text-cyan-300" aria-hidden="true" />
              <span className="break-all">{email}</span>
            </a>
          ))}
          <span className="block text-sm text-slate-400">Uttar Pradesh, India</span>
        </FooterGroup>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center sm:px-6">
        <p className="text-sm font-semibold text-slate-300">
          © 2026 AKTUHub. All Rights Reserved.
        </p>
        <p className="mx-auto mt-2 max-w-4xl text-xs leading-6 text-slate-500">
          AKTUHub is an independent platform and is not affiliated with or endorsed by
          Dr. A.P.J. Abdul Kalam Technical University (AKTU).
        </p>
      </div>
    </footer>
  )
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-200">{title}</h3>
      <div className="mt-4 space-y-2.5">{children}</div>
    </div>
  )
}
