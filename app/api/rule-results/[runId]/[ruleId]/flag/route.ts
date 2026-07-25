import { NextResponse } from "next/server"
import { setFlag } from "@/lib/mock-data"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; ruleId: string }> },
) {
  const { runId, ruleId } = await params
  const body = await request.json().catch(() => ({}))
  const flagged = Boolean(body.flagged)
  setFlag(runId, ruleId, flagged)
  return NextResponse.json({ flagged })
}
