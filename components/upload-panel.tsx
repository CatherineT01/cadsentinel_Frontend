"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  X,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Loader2,
  Bell,
  FileText,
} from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/providers"
import { checkDuplicates, uploadDrawing } from "@/lib/api"
import type { DuplicateInfo, Section, UploadQueueItem } from "@/lib/types"
import { SECTIONS } from "@/lib/rules"
import { cn } from "@/lib/utils"

const BATCH_LIMIT = 50

interface Props {
  open: boolean
  onClose: () => void
}

type Phase = "select" | "duplicates" | "processing" | "complete"

export function UploadPanel({ open, onClose }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [phase, setPhase] = useState<Phase>("select")
  const [files, setFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [notify, setNotify] = useState(false)
  const [batchId, setBatchId] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)

  // Reset when closed
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("select")
        setFiles([])
        setError(null)
        setDuplicates([])
        setQueue([])
        setBatchId("")
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleFiles = useCallback(
    (selected: string[]) => {
      setError(null)
      const dwgFiles = selected.filter((f) => f.toLowerCase().endsWith(".dwg"))
      if (dwgFiles.length === 0) {
        setError("No .dwg files found in the selection.")
        return
      }
      if (dwgFiles.length > BATCH_LIMIT) {
        setError(
          `Batch limit is ${BATCH_LIMIT} drawings. You selected ${dwgFiles.length}. Please reduce your selection and try again.`,
        )
        return
      }
      setFiles(dwgFiles)
      void runDuplicateCheck(dwgFiles)
    },
    [],
  )

  async function runDuplicateCheck(filenames: string[]) {
    try {
      const res = await checkDuplicates(filenames)
      if (res.duplicates.length > 0) {
        setDuplicates(res.duplicates)
        setPhase("duplicates")
      } else {
        startProcessing(filenames, "new")
      }
    } catch {
      // If duplicate check fails, proceed as if no duplicates
      startProcessing(filenames, "new")
    }
  }

  function buildQueue(filenames: string[]): UploadQueueItem[] {
    return filenames.map((fn, i) => ({
      id: `item-${i}-${fn}`,
      filename: fn,
      status: "queued",
      progress: 0,
      sections: SECTIONS.map((s) => ({ name: s, status: "pending" as const })),
    }))
  }

  async function startProcessing(filenames: string[], mode: "new" | "replace", skipDups = false) {
    let toProcess = filenames
    if (mode === "new" && skipDups) {
      const dupNames = new Set(duplicates.map((d) => d.filename.toLowerCase()))
      toProcess = filenames.filter((f) => !dupNames.has(f.toLowerCase()))
    }
    if (mode === "replace") {
      // delete existing duplicate records before reprocessing
      duplicates.forEach((d) => {
        // best-effort: the upload route handles replacement by name
      })
    }
    if (toProcess.length === 0) {
      setError("No drawings left to process after skipping duplicates.")
      setPhase("select")
      return
    }
    const id = `BATCH-${Date.now().toString(36)}`
    setBatchId(id)
    setQueue(buildQueue(toProcess))
    setPhase("processing")
    processingRef.current = true
    void processQueue(toProcess, id, mode)
  }

  async function processQueue(filenames: string[], id: string, mode: "new" | "replace") {
    for (let i = 0; i < filenames.length; i++) {
      const fn = filenames[i]
      // uploading
      setQueue((q) =>
        q.map((it, idx) =>
          idx === i ? { ...it, status: "uploading", progress: 10 } : it,
        ),
      )
      await delay(500)
      // parsing
      setQueue((q) =>
        q.map((it, idx) =>
          idx === i ? { ...it, status: "parsing", progress: 30 } : it,
        ),
      )
      await delay(700)
      // running checks — cycle through sections
      setQueue((q) =>
        q.map((it, idx) =>
          idx === i ? { ...it, status: "running_checks", progress: 40 } : it,
        ),
      )
      for (let s = 0; s < SECTIONS.length; s++) {
        setQueue((q) =>
          q.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  progress: 40 + Math.round((s / SECTIONS.length) * 50),
                  sections: it.sections.map((sec, si) =>
                    si === s ? { ...sec, status: "running" } : sec,
                  ),
                }
              : it,
          ),
        )
        await delay(350)
        // flip section to pass/fail
        setQueue((q) =>
          q.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  sections: it.sections.map((sec, si) =>
                    si === s
                      ? { ...sec, status: Math.random() > 0.18 ? "pass" : "fail" }
                      : sec,
                  ),
                }
              : it,
          ),
        )
      }
      // call the mock upload API
      try {
        const res = await uploadDrawing(fn)
        setQueue((q) =>
          q.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: "complete",
                  progress: 100,
                  result: {
                    drawing_id: res.drawing.id,
                    grade: res.run.grade,
                    pass_count: res.run.pass_count,
                    fail_count: res.run.fail_count,
                    warning_count: res.run.warning_count,
                  },
                }
              : it,
          ),
        )
      } catch {
        setQueue((q) =>
          q.map((it, idx) =>
            idx === i
              ? { ...it, status: "failed", progress: 100, error: "Upload failed" }
              : it,
          ),
        )
      }
    }
    processingRef.current = false
    setPhase("complete")
    if (notify && typeof window !== "undefined" && "Notification" in window) {
      const passed = queue.filter((q) => q.status === "complete").length
      const failed = queue.filter((q) => q.status === "failed").length
      try {
        new Notification("CADSentinel — Batch complete", {
          body: `${filenames.length} drawings processed, ${passed} passed, ${failed} failed.`,
        })
      } catch {
        // ignore
      }
    }
  }

  function toggleNotify(v: boolean) {
    setNotify(v)
    if (v && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {})
      }
    }
  }

  const summary = useMemo(() => {
    if (phase !== "complete") return null
    const processed = queue.length
    const passed = queue.filter((q) => q.status === "complete").length
    const failed = queue.filter((q) => q.status === "failed").length
    const errors = queue.filter((q) => q.status === "failed").length
    return { processed, passed, failed, errors }
  }, [phase, queue])

  const completedCount = queue.filter((q) => q.status === "complete" || q.status === "failed").length

  function viewResults() {
    onClose()
    router.push("/drawings")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              {phase === "processing"
                ? `Processing ${queue.length} drawings`
                : phase === "complete"
                  ? "Batch Complete"
                  : "Bulk Upload"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {phase === "select" && (
            <SelectPhase
              error={error}
              onPick={handleFiles}
              fileInputRef={fileInputRef}
            />
          )}

          {phase === "duplicates" && (
            <DuplicatesPhase
              duplicates={duplicates}
              totalCount={files.length}
              onContinue={() => startProcessing(files, "replace")}
              onSkip={() => startProcessing(files, "new", true)}
              onCancel={() => setPhase("select")}
            />
          )}

          {phase === "processing" && (
            <ProcessingPhase
              queue={queue}
              completedCount={completedCount}
              notify={notify}
              onNotify={toggleNotify}
            />
          )}

          {phase === "complete" && summary && (
            <CompletePhase summary={summary} queue={queue} onView={viewResults} />
          )}
        </div>
      </aside>
    </div>
  )
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/* ------------------------------------------------------------------ */
/* Select phase                                                        */
/* ------------------------------------------------------------------ */

function SelectPhase({
  error,
  onPick,
  fileInputRef,
}: {
  error: string | null
  onPick: (files: string[]) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
  const [dragOver, setDragOver] = useState(false)

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const items = Array.from(e.dataTransfer.items)
    const names: string[] = []
    function walk(item: DataTransferItem, prefix = "") {
      const entry = item.webkitGetAsEntry?.() as FileSystemEntry | undefined
      if (!entry) return
      if (entry.isFile) {
        const f = entry as FileSystemFileEntry
        names.push(prefix + f.name)
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader()
        reader.readEntries((entries) => {
          entries.forEach((en) => {
            if (en.isFile) names.push(prefix + en.name)
          })
        })
      }
    }
    items.forEach((it) => walk(it))
    // Fallback: use files directly
    if (names.length === 0) {
      const files = Array.from(e.dataTransfer.files).map((f) => f.name)
      onPick(files)
    } else {
      onPick(names)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
        )}
      >
        <UploadCloud className="size-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Drag and drop a folder or select multiple .dwg files
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Up to {BATCH_LIMIT} drawings per batch
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileText className="size-3.5" /> Browse files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".dwg"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).map((f) => f.name)
            onPick(files)
            e.target.value = ""
          }}
        />
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/20">
          {error}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Duplicates phase                                                    */
/* ------------------------------------------------------------------ */

function DuplicatesPhase({
  duplicates,
  totalCount,
  onContinue,
  onSkip,
  onCancel,
}: {
  duplicates: DuplicateInfo[]
  totalCount: number
  onContinue: () => void
  onSkip: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Drawings Already on File</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {duplicates.length} of {totalCount} selected drawings are already in the database.
        </p>
      </div>
      <ul className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-3">
        {duplicates.map((d) => (
          <li key={d.drawing_id} className="flex items-center gap-2 text-sm">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span className="font-mono text-xs text-foreground">{d.filename}</span>
            <span className="text-xs text-muted-foreground">
              — already processed on {new Date(d.processed_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Continuing will delete the existing records for these drawings and reprocess them from scratch. Drawings not on this list will be unaffected.
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" size="sm" onClick={onSkip}>
          Skip Duplicates and Continue
        </Button>
        <Button size="sm" onClick={onContinue}>
          Continue with Full Batch
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Processing phase                                                    */
/* ------------------------------------------------------------------ */

function ProcessingPhase({
  queue,
  completedCount,
  notify,
  onNotify,
}: {
  queue: UploadQueueItem[]
  completedCount: number
  notify: boolean
  onNotify: (v: boolean) => void
}) {
  const overall = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Bell className="size-4 text-muted-foreground" />
          <span>Notify me when done</span>
        </div>
        <Switch checked={notify} onChange={onNotify} label="Notify when done" />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {completedCount} / {queue.length} drawings complete
          </span>
          <span className="tabular-nums text-muted-foreground">{overall}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {queue.map((item) => (
          <QueueRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<UploadQueueItem["status"], string> = {
  queued: "Queued",
  uploading: "Uploading",
  parsing: "Parsing",
  running_checks: "Running Checks",
  complete: "Complete",
  failed: "Failed",
}

function QueueRow({ item }: { item: UploadQueueItem }) {
  const active = item.status === "uploading" || item.status === "parsing" || item.status === "running_checks"
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2.5">
        {item.status === "complete" ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
        ) : item.status === "failed" ? (
          <XCircle className="size-4 shrink-0 text-red-600" />
        ) : active ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <span className="size-4 shrink-0 rounded-full border border-border" />
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-foreground">
          {item.filename}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[item.status]}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            item.status === "failed" ? "bg-red-500" : item.status === "complete" ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ width: `${item.progress}%` }}
        />
      </div>
      {(item.status === "running_checks" || item.status === "complete") && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.sections.map((s) => (
            <span
              key={s.name}
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                s.status === "pass"
                  ? "bg-emerald-50 text-emerald-700"
                  : s.status === "fail"
                    ? "bg-red-50 text-red-700"
                    : s.status === "running"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {s.status === "pass" ? "✓" : s.status === "fail" ? "✗" : s.status === "running" ? "…" : "•"}
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Complete phase                                                      */
/* ------------------------------------------------------------------ */

function CompletePhase({
  summary,
  queue,
  onView,
}: {
  summary: { processed: number; passed: number; failed: number; errors: number }
  queue: UploadQueueItem[]
  onView: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-emerald-600/30 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-800">
          Batch complete — {summary.processed} processed, {summary.passed} passed, {summary.failed} failed, {summary.errors} errors
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {queue.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 rounded-md border border-border bg-card p-3">
            {item.status === "complete" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="size-4 shrink-0 text-red-600" />
            )}
            <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-foreground">
              {item.filename}
            </span>
            {item.result && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.result.pass_count}P · {item.result.fail_count}F · {item.result.warning_count}W
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onView}>
          View Results
        </Button>
      </div>
    </div>
  )
}
