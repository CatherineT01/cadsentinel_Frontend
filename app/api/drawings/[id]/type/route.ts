import { NextResponse } from "next/server"
import { reprocessDrawing } from "@/lib/mock-data"
import type { DrawingType } from "@/lib/types"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}))
  const type = body.type as DrawingType | undefined
  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 })
  }
  const { run, results } = reprocessDrawing(params.id, type)
  return NextResponse.json({ ok: true, run_id: run.id, pass_count: run.pass_count, fail_count: run.fail_count, warning_count: run.warning_count })
}
