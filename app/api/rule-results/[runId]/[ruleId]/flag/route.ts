import { NextResponse } from "next/server"
import { setFlag } from "@/lib/mock-data"

export async function POST(
  request: Request,
  { params }: { params: { runId: string; ruleId: string } },
) {
  const body = await request.json().catch(() => ({}))
  const flagged = Boolean(body.flagged)
  setFlag(params.runId, params.ruleId, flagged)
  return NextResponse.json({ flagged })
}
