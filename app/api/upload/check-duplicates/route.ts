import { NextResponse } from "next/server"
import { findDuplicates } from "@/lib/mock-data"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const filenames = (body.filenames as string[]) ?? []
  const duplicates = findDuplicates(filenames)
  return NextResponse.json({ duplicates })
}
