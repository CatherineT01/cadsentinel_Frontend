import { NextResponse } from "next/server"
import { getHistoricalRunDetail } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> },
) {
  const { id, runId } = await params
  const detail = getHistoricalRunDetail(id, runId)
  if (!detail) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }
  return NextResponse.json(detail)
}
