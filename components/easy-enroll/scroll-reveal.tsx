"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  animation?: "fade-in" | "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale-in" | "3d-flip"
  delay?: number  // ms
  duration?: number  // ms
  threshold?: number // 0-1
  once?: boolean
}

export function ScrollReveal({
  children,
  className,
  animation = "fade-up",
  delay = 0,
  duration = 650,
  threshold = 0.04,
  once = true,
}: ScrollRevealProps) {
  // Start visible — prevents flash of invisible content on mobile
  // where IntersectionObserver fires late or scroll position starts mid-page
  const [isVisible, setIsVisible] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // If IntersectionObserver is not supported (very old mobile) → show immediately
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasTriggered(true)
          if (once) observer.unobserve(el)
        } else if (!once && hasTriggered) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        // generous rootMargin so elements near the fold show immediately on mobile
        rootMargin: "0px 0px -20px 0px",
      },
    )

    observer.observe(el)

    // Fallback: if element is already in viewport on mount (common on mobile
    // when page loads scrolled or element is near top), show immediately
    const rect = el.getBoundingClientRect()
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0
    if (inViewport) {
      setIsVisible(true)
      if (once) observer.unobserve(el)
    }

    return () => observer.unobserve(el)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, once])

  const getHiddenClass = () => {
    if (isVisible) return ""
    switch (animation) {
      case "fade-in":    return "opacity-0"
      case "fade-up":    return "opacity-0 translate-y-6"
      case "fade-down":  return "opacity-0 -translate-y-6"
      case "fade-left":  return "opacity-0 translate-x-6"
      case "fade-right": return "opacity-0 -translate-x-6"
      case "scale-in":   return "opacity-0 scale-95"
      case "3d-flip":    return "opacity-0 [transform:perspective(600px)_rotateX(12deg)]"
      default:           return "opacity-0"
    }
  }

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: isVisible ? `${delay}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        transitionProperty: "opacity, transform, filter",
      }}
      className={cn(
        "will-change-[transform,opacity]",
        isVisible ? "opacity-100 translate-y-0 translate-x-0 scale-100" : getHiddenClass(),
        className,
      )}
    >
      {children}
    </div>
  )
}
