"use client"

import { useState } from "react"
import { Plus, Trash2, Calculator, RotateCcw } from "lucide-react"

interface SemesterEntry {
  id: number
  sgpa: string
  credits: string
}

export function SGPAToCGPACalculator() {
  const [semesters, setSemesters] = useState<SemesterEntry[]>([
    { id: 1, sgpa: "", credits: "" },
    { id: 2, sgpa: "", credits: "" },
  ])
  const [result, setResult] = useState<{ cgpa: string; totalCredits: number } | null>(null)
  const [error, setError] = useState<string>("")

  const addSemester = () => {
    if (semesters.length >= 8) {
      setError("Maximum 8 semesters allowed")
      return
    }
    const newId = semesters.length > 0 ? Math.max(...semesters.map(s => s.id)) + 1 : 1
    setSemesters([...semesters, { id: newId, sgpa: "", credits: "" }])
    setError("")
  }

  const removeSemester = (id: number) => {
    if (semesters.length <= 2) {
      setError("Minimum 2 semesters required")
      return
    }
    setSemesters(semesters.filter(s => s.id !== id))
    setResult(null)
    setError("")
  }

  const updateSemester = (id: number, field: "sgpa" | "credits", value: string) => {
    // Validate SGPA input (0.0 to 10.0)
    if (field === "sgpa") {
      const num = parseFloat(value)
      if (!isNaN(num) && (num < 0 || num > 10)) {
        setError("SGPA must be between 0.0 and 10.0")
        return
      }
    }
    
    setSemesters(semesters.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
    setResult(null)
    setError("")
  }

  const calculateCGPA = () => {
    const validEntries = semesters.filter(s => s.sgpa !== "" && s.credits !== "")
    
    if (validEntries.length < 2) {
      setError("Please enter SGPA and credits for at least 2 semesters")
      return
    }

    let totalWeightedPoints = 0
    let totalCredits = 0

    for (const entry of validEntries) {
      const sgpa = parseFloat(entry.sgpa)
      const credits = parseInt(entry.credits)
      
      if (isNaN(sgpa) || isNaN(credits) || credits <= 0) {
        setError("Please enter valid SGPA (0-10) and credits (positive number) for all semesters")
        return
      }
      
      totalWeightedPoints += sgpa * credits
      totalCredits += credits
    }

    const cgpa = totalWeightedPoints / totalCredits
    setResult({
      cgpa: cgpa.toFixed(2),
      totalCredits
    })
    setError("")
  }

  const resetCalculator = () => {
    setSemesters([
      { id: 1, sgpa: "", credits: "" },
      { id: 2, sgpa: "", credits: "" },
    ])
    setResult(null)
    setError("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 mb-3">
          <Calculator className="size-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">SGPA to CGPA Calculator</h3>
        <p className="text-sm text-slate-400 mt-1">
          Enter your semester SGPA and credits to calculate your cumulative CGPA
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Semester Entries */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {semesters.map((semester, index) => (
          <div
            key={semester.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="text-xs font-semibold text-slate-400 w-16 shrink-0">
              Sem {index + 1}
            </span>
            
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">SGPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="0.00"
                  value={semester.sgpa}
                  onChange={(e) => updateSemester(semester.id, "sgpa", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white/5 border border-white/20 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Credits</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Credits"
                  value={semester.credits}
                  onChange={(e) => updateSemester(semester.id, "credits", e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white/5 border border-white/20 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            {semesters.length > 2 && (
              <button
                onClick={() => removeSemester(semester.id)}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                title="Remove semester"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={addSemester}
          disabled={semesters.length >= 8}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-white/20 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="size-4" />
          Add Semester
        </button>
        
        <button
          onClick={calculateCGPA}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 transition-all"
        >
          <Calculator className="size-4" />
          Calculate
        </button>

        <button
          onClick={resetCalculator}
          className="p-2.5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Reset"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-400/30">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-1">Your Cumulative CGPA</p>
            <p className="text-4xl font-black text-white">{result.cgpa}</p>
            <p className="text-xs text-slate-500 mt-2">
              Based on {semesters.filter(s => s.sgpa !== "" && s.credits !== "").length} semesters • {result.totalCredits} total credits
            </p>
          </div>
          
          {/* CGPA Grade Indicator */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Grade:</span>
              <span className={`font-bold ${
                parseFloat(result.cgpa) >= 9 ? 'text-green-400' :
                parseFloat(result.cgpa) >= 8 ? 'text-blue-400' :
                parseFloat(result.cgpa) >= 7 ? 'text-yellow-400' :
                parseFloat(result.cgpa) >= 6 ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {parseFloat(result.cgpa) >= 9 ? 'O (Outstanding)' :
                 parseFloat(result.cgpa) >= 8 ? 'A+ (Excellent)' :
                 parseFloat(result.cgpa) >= 7 ? 'A (Very Good)' :
                 parseFloat(result.cgpa) >= 6 ? 'B+ (Good)' :
                 parseFloat(result.cgpa) >= 5 ? 'B (Above Average)' :
                 'F (Fail)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> CGPA is calculated using the weighted average method: 
          CGPA = Σ(SGPA × Credits) / Σ(Credits)
        </p>
      </div>
    </div>
  )
}