"use client"

import { Moon, Sun } from "lucide-react"
import { useAppTheme } from "./theme-context"

export function AppHeader() {
  const { theme, setTheme } = useAppTheme()
  const isLight = theme === "light"

  return (
    <header className="glass sticky top-0 z-30 border-b border-white/[0.06]">
      {/* neon top accent line */}
      <div className="neon-line absolute inset-x-0 top-0 h-[1px]" />

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-purple-900/60 to-indigo-900/40 shadow-lg shadow-purple-950/50 transition-all duration-300 hover:scale-105 hover:border-purple-500/40 hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-transparent" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/aktuhub-logo.png"
              alt="AKTUHub logo"
              className="relative size-full object-cover"
            />
          </div>

          <div className="leading-tight">
            <p className="text-lg font-black tracking-tight text-white">
              AKTU
              <span className="hero-title-main text-lg font-black">Hub</span>
            </p>
            <p className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">
              Smart Solutions · AKTU
            </p>
          </div>
        </div>

        {/* Right — status pill + theme toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="relative flex size-1.5 rounded-full bg-emerald-400">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            </span>
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-200 backdrop-blur-sm">
              Client-side · 100% Private
            </span>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isLight ? "purple" : "light")}
            aria-label={isLight ? "Switch to dark purple theme" : "Switch to light theme"}
            title={isLight ? "Switch to Dark Purple" : "Switch to Light"}
            className="group relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70"
            style={
              isLight
                ? {
                    borderColor: "rgba(139,92,246,0.4)",
                    background: "rgba(139,92,246,0.08)",
                    color: "#7c3aed",
                  }
                : {
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#e2e8f0",
                  }
            }
          >
            <span className="relative size-4 shrink-0">
              {/* Sun icon — shown in dark mode (click → go light) */}
              <Sun
                className={`absolute inset-0 size-4 transition-all duration-300 ${
                  isLight ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
                }`}
                aria-hidden="true"
              />
              {/* Moon icon — shown in light mode (click → go dark) */}
              <Moon
                className={`absolute inset-0 size-4 transition-all duration-300 ${
                  isLight ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
                }`}
                aria-hidden="true"
              />
            </span>
            <span className="hidden sm:inline">{isLight ? "Dark Purple" : "Light"}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
