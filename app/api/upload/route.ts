import { NextResponse } from "next/server"
import {
  createUploadedDrawing,
  simulateRunForDrawing,
  addRevision,
  addBatch,
} from "@/lib/mock-data"
import type { DrawingType } from "@/lib/types"

// Simple deterministic type guesser from filename
function guessType(filename: string): DrawingType {
  const f = filename.toLowerCase()
  if (f.includes("assy") || f.includes("assembly")) return "Assy"
  if (f.includes("rod") && f.includes("head")) return "REH"
  if (f.includes("cap") && f.includes("head")) return "CEH"
  if (f.includes("gland")) return "Gland"
  if (f.includes("piston") && !f.includes("rod")) return "Piston"
  if (f.includes("barrel") || f.includes("tube")) return "Barrel"
  if (f.includes("rod")) return "Rod"
  if (f.includes("pro") || f.includes("weld")) return "PRO"
  return "Acc/Misc"
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const filename = (body.filename as string) || "Unknown.dwg"
  const type = (body.type as DrawingType | undefined) ?? guessType(filename)
  const batchId = (body.batch_id as string | undefined) ?? undefined

  const seed = Math.floor(Math.random() * 2147483647)
  const { run, results } = simulateRunForDrawing(filename, type, seed)
  const drawing = createUploadedDrawing(filename, type, run, results)
  run.drawing_id = drawing.id
  addRevision(drawing.id, run)

  if (batchId) {
    addBatch({
      id: batchId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      total: 1,
      passed: run.fail_count === 0 ? 1 : 0,
      failed: run.fail_count > 0 ? 1 : 0,
      errors: 0,
      drawing_ids: [drawing.id],
    })
  }

  return NextResponse.json({
    drawing,
    run: {
      id: run.id,
      grade: run.grade,
      pass_count: run.pass_count,
      fail_count: run.fail_count,
      warning_count: run.warning_count,
    },
  })
}
