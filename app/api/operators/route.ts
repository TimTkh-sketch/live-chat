import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get("workspaceId")
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const ops = await db.operator.findMany({
    where: { workspaceId },
    select: { id: true, name: true, avatar: true, isOnline: true },
  })
  return NextResponse.json(ops)
}

export async function POST(req: NextRequest) {
  const me = await getOperatorSession()
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, email, password } = await req.json()
  const bcrypt = await import("bcryptjs")
  const hashed = await bcrypt.hash(password, 10)

  const op = await db.operator.create({
    data: { workspaceId: me.workspaceId, name, email, password: hashed },
    select: { id: true, name: true, email: true },
  })
  return NextResponse.json(op)
}
