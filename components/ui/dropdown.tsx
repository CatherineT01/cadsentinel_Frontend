"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Dropdown({
  trigger,
  children,
  align = "start",
  className,
}: {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: "start" | "end"
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-block">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-40 rounded-md border border-border bg-popover p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  active,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  )
}
