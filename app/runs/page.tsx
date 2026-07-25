"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, FileBarChart } from "lucide-react"
import { useRuns, generateBatchReport } from "@/lib/api"
import { PageBody, PageHeader, Card, LoadingState, ErrorState, EmptyState } from "@/components/shell"
import { GradeBadge } from "@/components/badges"
import { formatDateTime } from "@/lib/ui"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/providers"

export default function RunsPage() {
  const { data, error, isLoading } = useRuns()
  const { toast } = useToast()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const runs = data?.runs ?? []
    return runs.filter((r) => r.drawing_name.toLowerCase().includes(query.toLowerCase()))
  }, [data, query])

  async function handleBatchReport(runId: string) {
    try {
      await generateBatchReport(runId)
      toast("Batch report generated", "success")
    } catch {
      toast("Failed to generate batch report", "error")
    }
  }

  return (
    <>
      <PageHeader
        title="Run History"
        description="Complete log of every validation run executed by the compliance engine."
      />
      <PageBody className="flex flex-col gap-4">
        <div className="relative sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runs by drawing…"
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState />
          ) : filtered.length === 0 ? (
            <EmptyState label="No runs found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Run</th>
                    <th className="px-4 py-2.5 font-medium">Drawing</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 text-center font-medium">Pass</th>
                    <th className="px-4 py-2.5 text-center font-medium">Fail</th>
                    <th className="px-4 py-2.5 text-center font-medium">Warn</th>
                    <th className="px-4 py-2.5 text-center font-medium">Review</th>
                    <th className="px-4 py-2.5 font-medium">Grade</th>
                    <th className="px-4 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-accent">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/drawings/${r.drawing_id}`}
                          className="font-mono text-xs font-medium text-foreground hover:text-primary"
                        >
                          {r.drawing_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(r.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums text-emerald-600">
                        {r.pass_count}
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums text-red-600">
                        {r.fail_count}
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums text-amber-600">
                        {r.warning_count}
                      </td>
                      <td className="px-4 py-3 text-center font-medium tabular-nums text-blue-600">
                        {r.review_count}
                      </td>
                      <td className="px-4 py-3">
                        <GradeBadge grade={r.grade} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBatchReport(r.id)}
                          title="Generate batch report"
                        >
                          <FileBarChart className="size-3.5" /> Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="text-xs text-muted-foreground">{filtered.length} runs</p>
      </PageBody>
    </>
  )
}
