"use client"

import { useEffect } from "react"

type Handler = (e: KeyboardEvent) => void

export interface ShortcutDef {
  key: string
  description: string
  handler?: Handler
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  )
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const match = shortcuts.find((s) => s.key.toLowerCase() === e.key.toLowerCase())
      if (match?.handler) {
        e.preventDefault()
        match.handler(e)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [shortcuts])
}

export { isEditableTarget }
