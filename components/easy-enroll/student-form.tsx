"use client"

import { GraduationCap, UserRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StudentInfo } from "./types"

interface Props {
  student: StudentInfo
  onChange: (patch: Partial<StudentInfo>) => void
}

export function StudentForm({ student, onChange }: Props) {
  return (
    <Card className="glass-panel overflow-hidden">
      <CardHeader className="border-b border-white/10 bg-white/[0.01] pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base text-white font-black">
            <UserRound className="size-4 text-purple-400" aria-hidden="true" />
            Student Details
          </CardTitle>
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
            Basic profile
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="roll" className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Roll Number
          </Label>
          <Input
            id="roll"
            placeholder="220123010001"
            value={student.rollNumber}
            onChange={(e) => onChange({ rollNumber: e.target.value })}
            className="h-11 glass-input"
          />
        </div>
 
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Full Name
          </Label>
          <Input
            id="name"
            placeholder="Student full name"
            value={student.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className="h-11 glass-input"
          />
        </div>
 
        <div className="space-y-2">
          <Label htmlFor="branch" className="text-xs font-bold uppercase tracking-wide text-slate-300">
            Branch
          </Label>
          <div className="relative">
            <GraduationCap
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-purple-400/80"
              aria-hidden="true"
            />
            <Input
              id="branch"
              placeholder="e.g. Computer Science"
              value={student.branch}
              onChange={(e) => onChange({ branch: e.target.value })}
              className="h-11 glass-input pl-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
