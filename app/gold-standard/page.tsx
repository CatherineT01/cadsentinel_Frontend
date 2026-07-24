"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, X, Pencil, ArrowRight } from "lucide-react"
import { useGoldStandard } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState } from "@/components/shell"
import { StatusBadge } from "@/components/badges"
import { StatCard } from "@/components/stat-card"
import { formatDate } from "@/lib/ui"
import type { GoldStandardEntry, RuleStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: RuleStatus[] = ["pass", "fail", "warning", "needs_review"]

export default function GoldStandardPage() {
  const { data, error, isLoading } = useGoldStandard()
  const [entries, setEntries] = useState<GoldStandardEntry[]>([])
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    if (data?.entries) setEntries(data.entries)
  }, [data])

  const stats = useMemo(() => {
    const total = entries.length
    const matches = entries.filter((e) => e.system_verdict === e.gold_verdict).length
    const correctness = total > 0 ? matches / total : 0
    return { total, matches, mismatches: total - matches, correctness }
  }, [entries])

  function updateGold(id: string, verdict: RuleStatus) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, gold_verdict: verdict } : e)),
    )
    setEditing(null)
  }

  return (
    <>
      <PageHeader
        title="Gold Standard"
        description="Human-reviewed annotations compared against automated system verdicts."
      />
      <PageBody className="flex flex-col gap-6">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Decision Correctness"
                value={`${Math.round(stats.correctness * 100)}%`}
                sub="System verdicts matching gold standard"
                icon={Check}
                valueClassName={
                  stats.correctness >= 0.85
                    ? "text-emerald-600"
                    : stats.correctness >= 0.6
                      ? "text-amber-600"
                      : "text-red-600"
                }
              />
              <StatCard
                label="Confirmed"
                value={String(stats.matches)}
                sub="Annotations in agreement"
                icon={Check}
                valueClassName="text-emerald-600"
              />
              <StatCard
                label="Overrides"
                value={String(stats.mismatches)}
                sub="Reviewer disagreed with system"
                icon={X}
                valueClassName="text-red-600"
              />
            </div>

            <Card
              title="Verdict Comparison"
              description="System verdict vs. gold standard. Click the pencil to edit a reviewer verdict."
            >
              <ul className="divide-y divide-border">
                {entries.map((e) => {
                  const match = e.system_verdict === e.gold_verdict
                  return (
                    <li key={e.id} className="px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {e.rule_code}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {e.drawing_name}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {e.section} · Reviewed by {e.reviewer} on {formatDate(e.reviewed_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              System
                            </span>
                            <StatusBadge status={e.system_verdict} />
                          </div>

                          <ArrowRight className="mt-4 size-4 text-muted-foreground" />

                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Gold Standard
                            </span>
                            {editing === e.id ? (
                              <select
                                autoFocus
                                value={e.gold_verdict}
                                onChange={(ev) => updateGold(e.id, ev.target.value as RuleStatus)}
                                onBlur={() => setEditing(null)}
                                className="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={e.gold_verdict} />
                                <button
                                  type="button"
                                  onClick={() => setEditing(e.id)}
                                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                  aria-label="Edit gold standard verdict"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                              match
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                : "bg-red-50 text-red-700 ring-1 ring-red-600/20",
                            )}
                          >
                            {match ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                            {match ? "Correct" : "Mismatch"}
                          </div>
                        </div>
                      </div>
                      {!match && (
                        <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                          {e.note}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          </>
        )}
      </PageBody>
    </>
  )
}
