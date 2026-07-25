"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  Target,
  Lightbulb,
  Quote,
  Flag,
  Plus,
  History,
  Trash2,
  ChevronRight,
  Printer,
  Folder,
} from "lucide-react"
import { useDrawing, useDrawings, useRevisions, toggleFlag, addNoteApi, logReview, overrideType, deleteDrawing } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState } from "@/components/shell"
import { GradeBadge, StatusBadge, TypeBadge } from "@/components/badges"
import { SECTIONS, DRAWING_TYPES, DRAWING_TYPE_LABELS } from "@/lib/rules"
import { STATUS_META, formatDateTime, formatDate, pct } from "@/lib/ui"
import type { DrawingDetail, RuleResult, Rule, Section, RuleStatus, DrawingType, Revision } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Dropdown, DropdownItem } from "@/components/ui/dropdown"
import { useToast } from "@/components/providers"
import { useKeyboardShortcuts, isEditableTarget } from "@/lib/use-shortcuts"

type SeverityFilter = "all" | "fail" | "warning" | "needs_review" | "pass"

const FILTERS: { key: SeverityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fail", label: "Failures" },
  { key: "warning", label: "Warnings" },
  { key: "needs_review", label: "Needs Review" },
  { key: "pass", label: "Passed" },
]

export default function DrawingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data, error, isLoading, mutate } = useDrawing(params.id)
  const { toast } = useToast()

  const [filter, setFilter] = useState<SeverityFilter>("all")
  const [expandedAll, setExpandedAll] = useState(false)
  const [flaggedSummaryOpen, setFlaggedSummaryOpen] = useState(true)
  const [reviewerName, setReviewerName] = useState("")
  const [showReviewPrompt, setShowReviewPrompt] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<DrawingType | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historicalRun, setHistoricalRun] = useState<string | null>(null)
  const [saveFolderOpen, setSaveFolderOpen] = useState(false)
  const [folderPath, setFolderPath] = useState("Z:/JIT/Reports/")
  const reviewPromptedRef = useRef(false)

  // Review log prompt on first open
  useEffect(() => {
    if (data && !reviewPromptedRef.current) {
      reviewPromptedRef.current = true
      const logged = data.drawing.last_reviewed_by
      if (!logged) setShowReviewPrompt(true)
    }
  }, [data])

  const allDrawings = useDrawings()
  const drawingList = allDrawings.data?.drawings ?? []
  const currentIndex = drawingList.findIndex((d) => d.id === params.id)

  function goNext() {
    if (currentIndex >= 0 && currentIndex < drawingList.length - 1) {
      router.push(`/drawings/${drawingList[currentIndex + 1].id}`)
    }
  }
  function goPrev() {
    if (currentIndex > 0) router.push(`/drawings/${drawingList[currentIndex - 1].id}`)
  }

  useKeyboardShortcuts([
    { key: "f", description: "Toggle failures filter", handler: () => setFilter((f) => (f === "fail" ? "all" : "fail")) },
    { key: "e", description: "Expand all", handler: () => setExpandedAll((e) => !e) },
    { key: "n", description: "Next drawing", handler: goNext },
    { key: "p", description: "Previous drawing", handler: goPrev },
    { key: "d", description: "Delete drawing", handler: () => setDeleteOpen(true) },
  ])

  async function handleLogReview() {
    const name = reviewerName.trim() || "Anonymous"
    try {
      await logReview(params.id, name)
      await mutate()
      setShowReviewPrompt(false)
      toast("Review logged", "success")
    } catch {
      toast("Failed to log review", "error")
    }
  }

  async function handleOverride(type: DrawingType) {
    setOverrideTarget(type)
    setOverrideOpen(false)
  }

  async function confirmOverride() {
    if (!overrideTarget || !data) return
    try {
      await overrideType(params.id, overrideTarget)
      await mutate()
      setOverrideTarget(null)
      toast("Drawing type updated — report refreshed", "success")
    } catch {
      toast("Failed to update drawing type", "error")
    }
  }

  async function handleDelete() {
    try {
      await deleteDrawing(params.id)
      toast("Drawing deleted", "success")
      router.push("/drawings")
    } catch {
      toast("Failed to delete drawing", "error")
    }
  }

  async function handleFlag(result: RuleResult & { rule: Rule }) {
    const newFlag = !result.flagged
    try {
      await toggleFlag(data!.latest_run.id, result.rule_id, newFlag)
      await mutate()
      toast(newFlag ? "Rule flagged" : "Flag removed", "success")
    } catch {
      toast("Failed to toggle flag", "error")
    }
  }

  async function handleAddNote(result: RuleResult & { rule: Rule }, text: string) {
    try {
      await addNoteApi(data!.latest_run.id, result.rule_id, text, reviewerName || "Anonymous")
      await mutate()
      toast("Note saved", "success")
    } catch {
      toast("Failed to save note", "error")
    }
  }

  function exportPdf(detail: DrawingDetail) {
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) return
    const rows = detail.results.map((r) => {
      const sym = r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : r.status === "warning" ? "⚠" : "?"
      const detailRow =
        r.status === "fail" || r.status === "warning"
          ? `<tr><td colspan="4" style="padding:4px 12px 8px 28px;font-size:11px;color:#475569;"><strong>Issue:</strong> ${escapeHtml(r.issue_description)}<br><strong>Fix:</strong> ${escapeHtml(r.suggested_fix)}</td></tr>`
          : ""
      return `<tr><td style="padding:4px 12px;font-family:monospace;font-size:12px;">${r.rule.rule_code}</td><td style="padding:4px 12px;font-size:12px;">${escapeHtml(r.rule.description)}</td><td style="padding:4px 12px;font-size:12px;">${r.rule.section}</td><td style="padding:4px 12px;font-size:14px;font-weight:bold;">${sym}</td></tr>${detailRow}`
    }).join("")
    const flagged = detail.results.filter((r) => r.flagged)
    const flaggedHtml = flagged.length
      ? `<h3 style="margin:16px 0 8px;font-size:13px;">Flagged Items</h3><ul style="font-size:11px;color:#475569;margin:0 0 8px 20px;">${flagged.map((r) => `<li>${r.rule.rule_code} — ${escapeHtml(r.rule.description)}${r.notes?.length ? ` (${r.notes.length} notes)` : ""}</li>`).join("")}</ul>`
      : ""
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(detail.drawing.name)} — Compliance Report</title><style>body{font-family:Georgia,serif;padding:40px;color:#0f172a;}h1{font-size:20px;margin:0 0 4px;}h2{font-size:14px;margin:16px 0 8px;border-bottom:1px solid #cbd5e1;padding-bottom:4px;}table{width:100%;border-collapse:collapse;}th{text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #cbd5e1;padding:4px 12px;}.header{display:flex;justify-content:space-between;border-bottom:2px solid #0f1e35;padding-bottom:12px;margin-bottom:16px;}.brand{font-family:monospace;font-size:16px;font-weight:bold;}.summary{display:flex;gap:24px;margin:12px 0;font-size:12px;}.footer{margin-top:32px;border-top:1px solid #cbd5e1;padding-top:8px;font-size:10px;color:#94a3b8;}</style></head><body>
<div class="header"><div><div class="brand">JIT Industries — CADSentinel</div><div style="font-size:11px;color:#64748b;">Compliance Validation Report</div></div><div style="text-align:right;font-size:11px;color:#64748b;">${new Date().toLocaleDateString()}</div></div>
<h1>${escapeHtml(detail.drawing.name)}</h1>
<div style="font-size:12px;color:#475569;margin-bottom:8px;">Type: ${detail.drawing.drawing_type} (${DRAWING_TYPE_LABELS[detail.drawing.drawing_type]}) · Grade: ${detail.drawing.grade} · Processed: ${formatDate(detail.latest_run.timestamp)}</div>
<div class="summary"><span>Pass: <strong>${detail.latest_run.pass_count}</strong></span><span>Fail: <strong>${detail.latest_run.fail_count}</strong></span><span>Warning: <strong>${detail.latest_run.warning_count}</strong></span><span>Needs Review: <strong>${detail.latest_run.review_count}</strong></span></div>
${flaggedHtml}
<h2>Rule Results</h2>
<table><thead><tr><th>Code</th><th>Description</th><th>Section</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Generated by CADSentinel on ${new Date().toLocaleString()}</div>
</body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  function saveToFolder(detail: DrawingDetail) {
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${detail.drawing.name.replace(/\s+/g, "_")}_ComplianceReport_${date}.pdf`
    toast(`Report saved to ${folderPath}${filename}`, "success")
    setSaveFolderOpen(false)
  }

  if (historicalRun) {
    return <HistoricalReport drawingId={params.id} runId={historicalRun} onBack={() => setHistoricalRun(null)} />
  }

  return (
    <>
      <PageHeader
        title="Compliance Report"
        description="Full rule-by-rule validation results for a single drawing."
        actions={
          <Link
            href="/drawings"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            <ArrowLeft className="size-4" /> Drawings
          </Link>
        }
      />
      <PageBody className="flex flex-col gap-6">
        {isLoading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState label="Drawing not found." />
        ) : (
          <ReportContent
            detail={data}
            filter={filter}
            setFilter={setFilter}
            expandedAll={expandedAll}
            flaggedSummaryOpen={flaggedSummaryOpen}
            setFlaggedSummaryOpen={setFlaggedSummaryOpen}
            showReviewPrompt={showReviewPrompt}
            setShowReviewPrompt={setShowReviewPrompt}
            reviewerName={reviewerName}
            setReviewerName={setReviewerName}
            onLogReview={handleLogReview}
            onFlag={handleFlag}
            onAddNote={handleAddNote}
            onOverride={handleOverride}
            overrideTarget={overrideTarget}
            confirmOverride={confirmOverride}
            cancelOverride={() => setOverrideTarget(null)}
            onExportPdf={() => exportPdf(data)}
            onExportCsv={() => exportCsv(data)}
            onSaveToFolder={() => setSaveFolderOpen(true)}
            onViewHistorical={(runId) => setHistoricalRun(runId)}
            deleteOpen={deleteOpen}
            setDeleteOpen={setDeleteOpen}
            confirmDelete={handleDelete}
          />
        )}
      </PageBody>

      <Modal open={saveFolderOpen} onClose={() => setSaveFolderOpen(false)} title="Save to Folder" size="sm">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground">Folder path</label>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            className="h-9 rounded-md border border-border bg-card px-3 font-mono text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <p className="text-xs text-muted-foreground">
            File: {data?.drawing.name.replace(/\s+/g, "_")}_ComplianceReport_{new Date().toISOString().slice(0, 10)}.pdf
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSaveFolderOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => data && saveToFolder(data)}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function exportCsv(detail: DrawingDetail) {
  const rows = [
    ["Rule Code", "Section", "Status", "Description", "Issue", "Suggested Fix", "Flagged"],
    ...detail.results.map((r) => [
      r.rule.rule_code,
      r.rule.section,
      r.status,
      r.rule.description,
      r.issue_description,
      r.suggested_fix,
      r.flagged ? "Yes" : "No",
    ]),
  ]
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${detail.drawing.name.replace(/\s+/g, "_")}_compliance.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/* Main report content                                                  */
/* ------------------------------------------------------------------ */

function ReportContent({
  detail,
  filter,
  setFilter,
  expandedAll,
  flaggedSummaryOpen,
  setFlaggedSummaryOpen,
  showReviewPrompt,
  setShowReviewPrompt,
  reviewerName,
  setReviewerName,
  onLogReview,
  onFlag,
  onAddNote,
  onOverride,
  overrideTarget,
  confirmOverride,
  cancelOverride,
  onExportPdf,
  onExportCsv,
  onSaveToFolder,
  onViewHistorical,
  deleteOpen,
  setDeleteOpen,
  confirmDelete,
}: {
  detail: DrawingDetail
  filter: SeverityFilter
  setFilter: (f: SeverityFilter) => void
  expandedAll: boolean
  flaggedSummaryOpen: boolean
  setFlaggedSummaryOpen: (v: boolean) => void
  showReviewPrompt: boolean
  setShowReviewPrompt: (v: boolean) => void
  reviewerName: string
  setReviewerName: (v: string) => void
  onLogReview: () => void
  onFlag: (r: RuleResult & { rule: Rule }) => void
  onAddNote: (r: RuleResult & { rule: Rule }, text: string) => void
  onOverride: (t: DrawingType) => void
  overrideTarget: DrawingType | null
  confirmOverride: () => void
  cancelOverride: () => void
  onExportPdf: () => void
  onExportCsv: () => void
  onSaveToFolder: () => void
  onViewHistorical: (runId: string) => void
  deleteOpen: boolean
  setDeleteOpen: (v: boolean) => void
  confirmDelete: () => void
}) {
  const { drawing, classification, latest_run, results, revisions } = detail
  const flagged = results.filter((r) => r.flagged)

  const counts = useMemo(() => {
    const c: Record<SeverityFilter, number> = { all: results.length, fail: 0, warning: 0, needs_review: 0, pass: 0 }
    results.forEach((r) => { c[r.status]++ })
    return c
  }, [results])

  return (
    <>
      {/* Review prompt */}
      {showReviewPrompt && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-600/30 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-blue-800">Enter your name to log this review</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Your name"
              className="h-8 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <Button size="sm" onClick={onLogReview}>Log Review</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowReviewPrompt(false); onLogReview() }}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Summary header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="font-mono text-base font-semibold text-foreground">{drawing.name}</h2>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <TypeBadge type={drawing.drawing_type} />
                <span className="text-xs text-muted-foreground">
                  {DRAWING_TYPE_LABELS[drawing.drawing_type]}
                </span>
                {drawing.type_overridden && (
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20">
                    Overridden
                  </span>
                )}
                <Dropdown align="start">
                  <span className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                    Override
                  </span>
                  {(close) => (
                    <>
                      {DRAWING_TYPES.map((t) => (
                        <DropdownItem key={t} active={t === drawing.drawing_type} onClick={() => { onOverride(t); close() }}>
                          {t} {t === drawing.drawing_type && "(current)"}
                        </DropdownItem>
                      ))}
                    </>
                  )}
                </Dropdown>
              </div>
              <span className="text-border">|</span>
              <span className="text-xs text-muted-foreground">
                Last run {formatDateTime(latest_run.timestamp)}
              </span>
              {drawing.last_reviewed_by && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-xs text-muted-foreground">
                    Last reviewed by <span className="font-medium text-foreground">{drawing.last_reviewed_by}</span> on {formatDate(drawing.last_reviewed_at!)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Grade</p>
              <div className="mt-1 flex justify-end">
                <GradeBadge grade={drawing.grade} className="size-8 text-sm" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pass Rate</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {pct(drawing.pass_rate)}
              </p>
            </div>
            <Dropdown
              trigger={
                <Button variant="outline" size="sm">
                  <Download className="size-3.5" /> Export <ChevronDown className="size-3" />
                </Button>
              }
              align="end"
            >
              {(close) => (
                <>
                  <DropdownItem onClick={() => { onExportPdf(); close() }}><Printer className="size-3.5" /> Download PDF</DropdownItem>
                  <DropdownItem onClick={() => { onSaveToFolder(); close() }}><Folder className="size-3.5" /> Save to Folder</DropdownItem>
                  <DropdownItem onClick={() => { onExportCsv(); close() }}><Download className="size-3.5" /> Download CSV</DropdownItem>
                </>
              )}
            </Dropdown>
          </div>
        </div>

        {/* Count strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile label="Pass" value={latest_run.pass_count} status="pass" />
          <CountTile label="Fail" value={latest_run.fail_count} status="fail" />
          <CountTile label="Warning" value={latest_run.warning_count} status="warning" />
          <CountTile label="Needs Review" value={latest_run.review_count} status="needs_review" />
        </div>
      </Card>

      {/* Flagged Items summary */}
      {flagged.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={() => setFlaggedSummaryOpen(!flaggedSummaryOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Flag className="size-4 text-amber-600" />
              <span className="text-sm font-semibold text-foreground">Flagged Items ({flagged.length})</span>
            </div>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", flaggedSummaryOpen && "rotate-180")} />
          </button>
          {flaggedSummaryOpen && (
            <ul className="divide-y divide-border border-t border-border">
              {flagged.map((r) => (
                <li key={r.rule_id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">{r.rule.rule_code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.rule.description}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.notes && r.notes.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 pl-4">
                      {r.notes.map((n) => (
                        <li key={n.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{n.author}</span> · {formatDate(n.created_at)}: {n.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Severity filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            {f.label}
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] tabular-nums",
              filter === f.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>
              {counts[f.key]}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpandedAll(!expandedAll)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          {expandedAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Rules grouped by section */}
      <div className="flex flex-col gap-5">
        {SECTIONS.map((section) => {
          const sectionResults = results.filter((r) => r.rule.section === section)
          const filtered = filter === "all" ? sectionResults : sectionResults.filter((r) => r.status === filter)
          if (filtered.length === 0) return null
          return <SectionBlock key={section} section={section} results={filtered} expandedAll={expandedAll} onFlag={onFlag} onAddNote={onAddNote} />
        })}
      </div>

      {/* Revision History */}
      {revisions.length > 0 && (
        <Card title="Revision History" description="All past runs for this drawing">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Run Date</th>
                  <th className="px-4 py-2.5 font-medium">Grade</th>
                  <th className="px-4 py-2.5 text-center font-medium">Pass</th>
                  <th className="px-4 py-2.5 text-center font-medium">Fail</th>
                  <th className="px-4 py-2.5 text-center font-medium">Warn</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revisions.map((rev) => (
                  <tr key={rev.run_id} className="hover:bg-accent">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {rev.is_current && (
                          <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                            Current
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDateTime(rev.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><GradeBadge grade={rev.grade} /></td>
                    <td className="px-4 py-3 text-center tabular-nums text-emerald-600">{rev.pass_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-red-600">{rev.fail_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-amber-600">{rev.warning_count}</td>
                    <td className="px-4 py-3 text-right">
                      {!rev.is_current && (
                        <button
                          type="button"
                          onClick={() => onViewHistorical(rev.run_id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View <ChevronRight className="size-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-600/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Permanently delete this drawing and all its runs.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5" /> Delete Drawing
          </Button>
        </div>
      </Card>

      {/* Override confirmation */}
      <Modal
        open={overrideTarget !== null}
        onClose={cancelOverride}
        title="Change Drawing Type"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={cancelOverride}>Cancel</Button>
            <Button size="sm" onClick={confirmOverride}>Continue</Button>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Changing the drawing type from <strong>{drawing.drawing_type}</strong> to <strong>{overrideTarget}</strong> will re-run all applicable checks. Continue?
        </p>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Drawing"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Are you sure you want to permanently delete <strong>{drawing.name}</strong> and all its revision history? This cannot be undone.
        </p>
      </Modal>
    </>
  )
}

function CountTile({ label, value, status }: { label: string; value: number; status: keyof typeof STATUS_META }) {
  const meta = STATUS_META[status]
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-1.5">
        <span className={cn("size-2 rounded-full", meta.dot)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function SectionBlock({
  section,
  results,
  expandedAll,
  onFlag,
  onAddNote,
}: {
  section: Section
  results: (RuleResult & { rule: Rule })[]
  expandedAll: boolean
  onFlag: (r: RuleResult & { rule: Rule }) => void
  onAddNote: (r: RuleResult & { rule: Rule }, text: string) => void
}) {
  const passCount = results.filter((r) => r.status === "pass").length
  return (
    <Card title={section} description={`${passCount} of ${results.length} rules passing`}>
      <ul className="divide-y divide-border">
        {results.map((r) => (
          <RuleRow key={r.rule_id} result={r} expandedAll={expandedAll} onFlag={onFlag} onAddNote={onAddNote} />
        ))}
      </ul>
    </Card>
  )
}

function RuleRow({
  result,
  expandedAll,
  onFlag,
  onAddNote,
}: {
  result: RuleResult & { rule: Rule }
  expandedAll: boolean
  onFlag: (r: RuleResult & { rule: Rule }) => void
  onAddNote: (r: RuleResult & { rule: Rule }, text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState("")
  const meta = STATUS_META[result.status]

  useEffect(() => { setOpen(expandedAll) }, [expandedAll])

  function submitNote() {
    if (noteText.trim()) {
      onAddNote(result, noteText.trim())
      setNoteText("")
      setAddingNote(false)
    }
  }

  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className={cn("h-8 w-1 shrink-0 rounded-full", meta.bar)} aria-hidden />
          <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
            {result.rule.rule_code}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
            {result.rule.description}
          </span>
        </button>
        {result.flagged && (
          <Flag className="size-3.5 shrink-0 fill-amber-500 text-amber-600" />
        )}
        <StatusBadge status={result.status} className="shrink-0" />
        <button
          type="button"
          onClick={() => onFlag(result)}
          className={cn(
            "shrink-0 rounded p-1 transition-colors",
            result.flagged ? "text-amber-600 hover:bg-amber-50" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          aria-label="Flag rule"
          title={result.flagged ? "Unflag" : "Flag"}
        >
          <Flag className={cn("size-3.5", result.flagged && "fill-amber-500")} />
        </button>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          onClick={() => setOpen((o) => !o)}
        />
      </div>
      {open && (
        <div className="border-t border-border bg-muted/30 px-4 py-4">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailBlock icon={Quote} title="Evidence">
              {result.evidence}
            </DetailBlock>
            <DetailBlock icon={Target} title="Issue Description">
              {result.issue_description}
            </DetailBlock>
            <DetailBlock icon={Lightbulb} title="Suggested Fix">
              {result.suggested_fix}
            </DetailBlock>
          </div>

          {/* Notes */}
          {result.notes && result.notes.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-foreground">Notes</p>
              {result.notes.map((n) => (
                <div key={n.id} className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs text-foreground">{n.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{n.author} · {formatDateTime(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add note */}
          <div className="mt-3">
            {addingNote ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Waiver approved by Joe — 07/24/2026"
                  className="min-h-20 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setAddingNote(false); setNoteText("") }}>Cancel</Button>
                  <Button size="sm" onClick={submitNote}>Save Note</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAddingNote(true)}>
                <Plus className="size-3.5" /> Add Note
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function DetailBlock({ icon: Icon, title, children }: { icon: typeof Quote; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        {title}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Historical report view                                               */
/* ------------------------------------------------------------------ */

function HistoricalReport({ drawingId, runId, onBack }: { drawingId: string; runId: string; onBack: () => void }) {
  const { data, error, isLoading } = useDrawing(drawingId)
  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState label="Historical run not found." />
  const historicalRun = data.revisions.find((r) => r.run_id === runId)
  const runDate = historicalRun ? formatDateTime(historicalRun.timestamp) : runId
  return (
    <>
      <PageHeader
        title="Historical Compliance Report"
        description={`Historical — ${runDate}`}
        actions={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            <ArrowLeft className="size-4" /> Back to Current
          </button>
        }
      />
      <PageBody className="flex flex-col gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <h2 className="font-mono text-base font-semibold text-foreground">{data.drawing.name}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This is a read-only historical report from {runDate}. The current report may differ.
          </p>
        </Card>
      </PageBody>
    </>
  )
}
