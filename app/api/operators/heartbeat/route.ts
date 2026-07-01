import { NextResponse } from "next/server"
import { getOperatorSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST() {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await db.operator.update({ where: { id: op.id }, data: { isOnline: true, lastSeenAt: new Date() } })
  return NextResponse.json({ ok: true })
}
