"use client"

import { createContext, useCallback, useContext, useState } from "react"
import type { ReactNode } from "react"
import { UploadPanel } from "@/components/upload-panel"

interface UploadCtx {
  open: boolean
  openUpload: () => void
  closeUpload: () => void
}

const Ctx = createContext<UploadCtx | null>(null)

export function useUpload() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useUpload must be used within UploadProvider")
  return ctx
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openUpload = useCallback(() => setOpen(true), [])
  const closeUpload = useCallback(() => setOpen(false), [])

  return (
    <Ctx.Provider value={{ open, openUpload, closeUpload }}>
      {children}
      <UploadPanel open={open} onClose={closeUpload} />
    </Ctx.Provider>
  )
}
