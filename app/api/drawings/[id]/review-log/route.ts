import { NextResponse } from "next/server"
import { setReviewLog } from "@/lib/mock-data"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}))
  const reviewer = (body.reviewer as string) || "Anonymous"
  setReviewLog(params.id, reviewer)
  return NextResponse.json({ ok: true, reviewer })
}
