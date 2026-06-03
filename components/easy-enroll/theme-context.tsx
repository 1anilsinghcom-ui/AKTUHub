"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type AppTheme = "purple" | "light"

interface ThemeContextValue {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "purple",
  setTheme: () => {},
})

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("purple")

  useEffect(() => {
    const saved = localStorage.getItem("aktuhub-theme") as AppTheme | null
    if (saved === "light" || saved === "purple") setThemeState(saved)
  }, [])

  const setTheme = (t: AppTheme) => {
    setThemeState(t)
    localStorage.setItem("aktuhub-theme", t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
