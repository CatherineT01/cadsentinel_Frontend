import { NextResponse } from "next/server"
import { getDrawingsByRule } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ruleId: string }> },
) {
  const { ruleId } = await params
  const drawings = getDrawingsByRule(ruleId)
  return NextResponse.json({ drawings })
}
