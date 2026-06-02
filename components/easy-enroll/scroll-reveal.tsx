"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  animation?: "fade-in" | "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale-in" | "3d-flip"
  delay?: number // ms
  duration?: number // ms
  threshold?: number // 0 to 1
  once?: boolean
}

export function ScrollReveal({
  children,
  className,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.05,
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once && ref.current) {
            observer.unobserve(ref.current)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [threshold, once])

  const getAnimationStyles = () => {
    switch (animation) {
      case "fade-in":
        return isVisible ? "opacity-100" : "opacity-0"
      case "fade-up":
        return isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      case "fade-down":
        return isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      case "fade-left":
        return isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      case "fade-right":
        return isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
      case "scale-in":
        return isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      case "3d-flip":
        return isVisible 
          ? "opacity-100 [transform:rotateX(0deg)]" 
          : "opacity-0 [transform:rotateX(15deg)]"
      default:
        return ""
    }
  }

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      className={cn(
        "transition-all will-change-[transform,opacity]",
        getAnimationStyles(),
        className
      )}
    >
      {children}
    </div>
  )
}
