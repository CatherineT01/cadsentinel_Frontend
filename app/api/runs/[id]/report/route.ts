import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  // Mock: just acknowledge. The client generates the actual PDF.
  return NextResponse.json({ ok: true, run_id: id })
}
