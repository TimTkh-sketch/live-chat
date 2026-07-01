import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOperatorSession } from "@/lib/auth"

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
}

export async function POST(req: NextRequest) {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { subscription } = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })

  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      operatorId: op.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const op = await getOperatorSession()
  if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint } = await req.json()
  if (endpoint) {
    await db.pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {})
  }
  return NextResponse.json({ ok: true })
}
