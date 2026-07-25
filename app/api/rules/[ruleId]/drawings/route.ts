import { NextResponse } from "next/server"
import { getDrawingsByRule } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: { ruleId: string } },
) {
  const drawings = getDrawingsByRule(params.ruleId)
  return NextResponse.json({ drawings })
}
