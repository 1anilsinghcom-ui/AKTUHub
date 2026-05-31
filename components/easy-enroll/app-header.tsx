"use client"

export function AppHeader() {
  return (
    <header className="glass sticky top-0 z-30 border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#050b18] shadow-lg shadow-blue-950/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/aktuhub-logo.png"
              alt="AKTUHub logo"
              className="size-full object-cover"
            />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-black tracking-tight text-foreground">
              AKTU<span className="bg-gradient-to-r from-blue-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">Hub</span>
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Smart Solutions for AKTU Students & Faculty
            </p>
          </div>
        </div>

        <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-400 sm:block">
          Dashboard
        </div>
      </div>
    </header>
  )
}
