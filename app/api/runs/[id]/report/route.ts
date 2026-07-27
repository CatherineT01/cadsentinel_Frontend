import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  // Mock: just acknowledge. The client generates the actual PDF.
  return NextResponse.json({ ok: true, run_id: params.id })
}
