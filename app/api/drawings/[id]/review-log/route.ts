import { NextResponse } from "next/server"
import { setReviewLog } from "@/lib/mock-data"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reviewer = (body.reviewer as string) || "Anonymous"
  setReviewLog(id, reviewer)
  return NextResponse.json({ ok: true, reviewer })
}
