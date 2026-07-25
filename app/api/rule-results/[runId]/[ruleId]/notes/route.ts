import { NextResponse } from "next/server"
import { addNote } from "@/lib/mock-data"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; ruleId: string }> },
) {
  const { runId, ruleId } = await params
  const body = await request.json().catch(() => ({}))
  const text = (body.text as string) || ""
  const author = (body.author as string) || "Anonymous"
  if (!text.trim()) {
    return NextResponse.json({ error: "Note text required" }, { status: 400 })
  }
  const note = addNote(runId, ruleId, text.trim(), author)
  return NextResponse.json({ note })
}
