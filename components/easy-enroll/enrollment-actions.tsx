"use client"

import { RotateCcw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EnrollmentActionsProps {
  onReset: () => void
}

export function EnrollmentActions({ onReset }: EnrollmentActionsProps) {
  return (
    <div className="animate-enrollment-actions flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
        <ShieldCheck className="size-3.5 text-cyan-300" aria-hidden="true" />
        Processed in Browser
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-1.5 border-white/10 bg-white/[0.04] text-slate-100 transition-colors hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-white"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        New Student
      </Button>
    </div>
  )
}
