import { NextResponse } from "next/server"
import { getOperatorSession } from "@/lib/auth"

export async function GET() {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json(null)
  return NextResponse.json({ id: op.id, name: op.name, email: op.email, avatar: op.avatar, workspaceId: op.workspaceId, isOnline: op.isOnline })
}
