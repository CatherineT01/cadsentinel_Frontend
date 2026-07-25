import { NextResponse } from "next/server"
import { deleteDrawingCompletely, getDrawingDetail } from "@/lib/mock-data"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const detail = getDrawingDetail(id)
  if (!detail) {
    return NextResponse.json({ error: "Drawing not found" }, { status: 404 })
  }
  return NextResponse.json(detail)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  deleteDrawingCompletely(id)
  return NextResponse.json({ ok: true })
}
