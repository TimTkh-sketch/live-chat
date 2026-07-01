import { cookies } from "next/headers"
import { db } from "./db"

export async function getOperatorSession() {
  const jar = await cookies()
  const operatorId = jar.get("op_id")?.value
  if (!operatorId) return null
  const op = await db.operator.findUnique({ where: { id: operatorId }, include: { workspace: true } })
  return op
}

export async function requireOperator() {
  const op = await getOperatorSession()
  if (!op) throw new Error("UNAUTHORIZED")
  return op
}
