"use client"

export function AppHeader() {
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

        {/* Right — status pill */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="relative flex size-1.5 rounded-full bg-emerald-400">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          </span>
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-200 backdrop-blur-sm">
            Client-side · 100% Private
          </span>
        </div>
      </div>
    </header>
  )
}
