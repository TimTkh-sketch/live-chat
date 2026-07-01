import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const op = await db.operator.findFirst({ where: { email } })
  if (!op) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 })

  const ok = await bcrypt.compare(password, op.password)
  if (!ok) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 })

  await db.operator.update({ where: { id: op.id }, data: { isOnline: true, lastSeenAt: new Date() } })

  const jar = await cookies()
  jar.set("op_id", op.id, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 })

  return NextResponse.json({ ok: true, operator: { id: op.id, name: op.name, workspaceId: op.workspaceId } })
}
