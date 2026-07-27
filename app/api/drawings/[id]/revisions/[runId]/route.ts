import { NextResponse } from "next/server"
import { getHistoricalRunDetail } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: { id: string; runId: string } },
) {
  const detail = getHistoricalRunDetail(params.id, params.runId)
  if (!detail) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }
  return NextResponse.json(detail)
}
