import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getOperatorSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST() {
  const op = await getOperatorSession()
  if (op) await db.operator.update({ where: { id: op.id }, data: { isOnline: false } })
  const jar = await cookies()
  jar.delete("op_id")
  return NextResponse.json({ ok: true })
}
