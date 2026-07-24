"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  Target,
  Lightbulb,
  Quote,
} from "lucide-react"
import { useDrawing } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState } from "@/components/shell"
import { GradeBadge, StatusBadge, TypeBadge } from "@/components/badges"
import { SECTIONS } from "@/lib/rules"
import { DRAWING_TYPE_LABELS } from "@/lib/rules"
import { STATUS_META, formatDateTime, pct, ragasColor } from "@/lib/ui"
import type { DrawingDetail, RuleResult, Rule, Section } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export default function DrawingDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, error, isLoading } = useDrawing(params.id)

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
          <ReportContent detail={data} />
        )}
      </PageBody>
    </>
  )
}

function exportCsv(detail: DrawingDetail) {
  const rows = [
    ["Rule Code", "Section", "Status", "RAGAS", "Description", "Issue", "Suggested Fix"],
    ...detail.results.map((r) => [
      r.rule.rule_code,
      r.rule.section,
      r.status,
      String(r.ragas_composite),
      r.rule.description,
      r.issue_description,
      r.suggested_fix,
    ]),
  ]
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${detail.drawing.name.replace(/\s+/g, "_")}_compliance.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ReportContent({ detail }: { detail: DrawingDetail }) {
  const { drawing, classification, latest_run, results } = detail

  return (
    <>
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
                <TypeBadge type={classification.drawing_type} />
                <span className="text-xs text-muted-foreground">
                  {DRAWING_TYPE_LABELS[classification.drawing_type]}
                </span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Classification confidence</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    ragasColor(classification.confidence),
                  )}
                >
                  {pct(classification.confidence)}
                </span>
              </div>
              <span className="text-border">|</span>
              <span className="text-xs text-muted-foreground">
                Last run {formatDateTime(latest_run.timestamp)}
              </span>
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
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCsv(detail)}>
                <Download className="size-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-3.5" /> PDF
              </Button>
            </div>
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

      {/* RAGAS scores */}
      <Card title="RAGAS Quality Scores" description="Composite retrieval-augmented generation assessment for this run">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
          <RagasTile label="Retrieval Relevance" value={latest_run.ragas.retrieval_relevance} />
          <RagasTile label="Evidence Coverage" value={latest_run.ragas.evidence_coverage} />
          <RagasTile label="Decision Correctness" value={latest_run.ragas.decision_correctness} />
          <RagasTile label="Faithfulness" value={latest_run.ragas.faithfulness} />
          <RagasTile
            label="False Positive Risk"
            value={latest_run.ragas.false_positive_risk}
            invert
          />
          <RagasTile label="Composite" value={latest_run.ragas.composite} emphasize />
        </div>
      </Card>

      {/* Rules grouped by section */}
      <div className="flex flex-col gap-5">
        {SECTIONS.map((section) => {
          const sectionResults = results.filter((r) => r.rule.section === section)
          if (sectionResults.length === 0) return null
          return <SectionBlock key={section} section={section} results={sectionResults} />
        })}
      </div>
    </>
  )
}

function CountTile({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status: keyof typeof STATUS_META
}) {
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

function RagasTile({
  label,
  value,
  invert,
  emphasize,
}: {
  label: string
  value: number
  invert?: boolean
  emphasize?: boolean
}) {
  const effective = invert ? 1 - value : value
  return (
    <div className={cn("bg-card p-4", emphasize && "bg-accent")}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", ragasColor(effective))}>
        {value.toFixed(2)}
      </p>
    </div>
  )
}

function SectionBlock({
  section,
  results,
}: {
  section: Section
  results: (RuleResult & { rule: Rule })[]
}) {
  const passCount = results.filter((r) => r.status === "pass").length
  return (
    <Card
      title={section}
      description={`${passCount} of ${results.length} rules passing`}
    >
      <ul className="divide-y divide-border">
        {results.map((r) => (
          <RuleRow key={r.rule_id} result={r} />
        ))}
      </ul>
    </Card>
  )
}

function RuleRow({ result }: { result: RuleResult & { rule: Rule } }) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[result.status]
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className={cn("h-8 w-1 shrink-0 rounded-full", meta.bar)} aria-hidden />
        <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
          {result.rule.rule_code}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {result.rule.description}
        </span>
        <span className={cn("hidden shrink-0 text-xs tabular-nums sm:inline", ragasColor(result.ragas_composite))}>
          RAGAS {result.ragas_composite.toFixed(2)}
        </span>
        <StatusBadge status={result.status} className="shrink-0" />
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
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
        </div>
      )}
    </li>
  )
}

function DetailBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Quote
  title: string
  children: React.ReactNode
}) {
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
