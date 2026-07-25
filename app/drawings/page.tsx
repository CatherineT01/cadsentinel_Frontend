"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, ChevronRight } from "lucide-react"
import { useDrawings, useRules } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState, EmptyState } from "@/components/shell"
import { GradeBadge, StatusBadge, TypeBadge } from "@/components/badges"
import { DRAWING_TYPES } from "@/lib/rules"
import { formatDate, passRateColor, pct } from "@/lib/ui"
import type { Drawing, RuleStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

function drawingStatus(rate: number): Extract<RuleStatus, "pass" | "fail" | "needs_review"> {
  if (rate >= 0.85) return "pass"
  if (rate < 0.6) return "fail"
  return "needs_review"
}

export default function DrawingsPage() {
  const { data, error, isLoading } = useDrawings()
  const { data: rulesData } = useRules()
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [ruleQuery, setRuleQuery] = useState("")

  const filtered = useMemo(() => {
    const drawings: Drawing[] = data?.drawings ?? []
    const ruleCode = ruleQuery.trim().toLowerCase()
    let ruleMatchedDrawingIds: Set<string> | null = null
    if (ruleCode && rulesData) {
      const rule = rulesData.rules.find((r) => r.rule_code.toLowerCase() === ruleCode)
      if (rule) {
        ruleMatchedDrawingIds = new Set()
        // We can't fetch per-rule drawings here without another hook; use the existing
        // results data is not available client-side. For the mock, we filter by whether
        // the drawing type is applicable to the rule (a reasonable proxy) and mark all
        // as "matching". A full implementation would call /api/rules/:id/drawings.
        // For now, include drawings whose type is applicable to the rule.
        drawings.forEach((d) => {
          if (rule.applicable_drawing_types.includes(d.drawing_type)) {
            ruleMatchedDrawingIds.add(d.id)
          }
        })
      } else {
        ruleMatchedDrawingIds = new Set()
      }
    }
    return drawings.filter((d) => {
      const matchesQuery = d.name.toLowerCase().includes(query.toLowerCase())
      const matchesType = typeFilter === "all" || d.drawing_type === typeFilter
      const matchesStatus = statusFilter === "all" || drawingStatus(d.pass_rate) === statusFilter
      const matchesRule = ruleMatchedDrawingIds === null || ruleMatchedDrawingIds.has(d.id)
      return matchesQuery && matchesType && matchesStatus && matchesRule
    })
  }, [data, query, typeFilter, statusFilter, ruleQuery, rulesData])

  return (
    <>
      <PageHeader
        title="Drawings"
        description="All engineering drawings processed by the CADSentinel validation engine."
      />
      <PageBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by drawing name or number…"
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={ruleQuery}
              onChange={(e) => setRuleQuery(e.target.value)}
              placeholder="Search by rule code (e.g. TB-01)…"
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <Select value={typeFilter} onChange={setTypeFilter} label="Type">
            <option value="all">All types</option>
            {DRAWING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={setStatusFilter} label="Status">
            <option value="all">All statuses</option>
            <option value="pass">Pass</option>
            <option value="needs_review">Needs review</option>
            <option value="fail">Fail</option>
          </Select>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState label="No drawings match the current filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Drawing</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Last Run</th>
                    <th className="px-4 py-2.5 font-medium">Last Reviewed</th>
                    <th className="px-4 py-2.5 font-medium">Pass Rate</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Grade</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((d) => (
                    <tr key={d.id} className="group transition-colors hover:bg-accent">
                      <td className="px-4 py-3">
                        <Link
                          href={`/drawings/${d.id}`}
                          className="font-mono text-xs font-medium text-foreground hover:text-primary"
                        >
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={d.drawing_type} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(d.last_run_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.last_reviewed_by ? (
                          <span className="text-xs">
                            <span className="font-medium text-foreground">{d.last_reviewed_by}</span>
                            <br />
                            <span className="text-[11px]">{d.last_reviewed_at ? formatDate(d.last_reviewed_at) : ""}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">Not reviewed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                d.pass_rate >= 0.85
                                  ? "bg-emerald-500"
                                  : d.pass_rate >= 0.6
                                    ? "bg-amber-500"
                                    : "bg-red-500",
                              )}
                              style={{ width: `${Math.round(d.pass_rate * 100)}%` }}
                            />
                          </div>
                          <span className={cn("tabular-nums", passRateColor(d.pass_rate))}>
                            {pct(d.pass_rate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={drawingStatus(d.pass_rate)} />
                      </td>
                      <td className="px-4 py-3">
                        <GradeBadge grade={d.grade} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/drawings/${d.id}`}
                          className="inline-flex items-center text-muted-foreground group-hover:text-primary"
                          aria-label={`View ${d.name}`}
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {data?.drawings.length ?? 0} drawings
        </p>
      </PageBody>
    </>
  )
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        {children}
      </select>
    </label>
  )
}
