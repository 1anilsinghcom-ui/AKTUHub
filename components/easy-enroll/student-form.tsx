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
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/70 bg-secondary/30 pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            Student Details
          </CardTitle>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Basic profile
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="roll" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Roll Number
          </Label>
          <Input
            id="roll"
            placeholder="220123010001"
            value={student.rollNumber}
            onChange={(e) => onChange({ rollNumber: e.target.value })}
            className="h-11 bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Full Name
          </Label>
          <Input
            id="name"
            placeholder="Student full name"
            value={student.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className="h-11 bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Branch
          </Label>
          <div className="relative">
            <GraduationCap
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="branch"
              placeholder="e.g. Computer Science"
              value={student.branch}
              onChange={(e) => onChange({ branch: e.target.value })}
              className="h-11 bg-background pl-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
