"use client"

import { useState } from "react"
import { Keyboard } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

export interface ShortcutEntry {
  key: string
  description: string
}

const SHORTCUTS: { group: string; items: ShortcutEntry[] }[] = [
  {
    group: "Global",
    items: [
      { key: "U", description: "Open the bulk upload dialog" },
      { key: "?", description: "Open this shortcuts help" },
      { key: "Esc", description: "Close any open modal, panel, or dropdown" },
    ],
  },
  {
    group: "Drawing Detail",
    items: [
      { key: "F", description: "Toggle Failures-only filter" },
      { key: "E", description: "Expand or collapse all rule rows" },
      { key: "N", description: "Go to the next drawing in the list" },
      { key: "P", description: "Go to the previous drawing in the list" },
      { key: "D", description: "Open the Delete Drawing confirmation" },
    ],
  },
]

export function ShortcutsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[55] flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-foreground md:left-4 md:right-auto"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="size-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Keyboard Shortcuts"
        size="md"
      >
        <div className="flex flex-col gap-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.group}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{item.description}</span>
                    <kbd
                      className={cn(
                        "rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground",
                      )}
                    >
                      {item.key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
