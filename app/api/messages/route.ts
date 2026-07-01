import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })

  const messages = await db.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(messages)
}

export async function POST(req: NextRequest) {
  const { sessionId, text, sender } = await req.json()
  if (!sessionId || !text || !sender) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const message = await db.chatMessage.create({ data: { sessionId, text, sender } })

  await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })

  if (sender === "operator") {
    await db.chatMessage.updateMany({
      where: { sessionId, sender: "visitor", isRead: false },
      data: { isRead: true },
    })
  }

  return NextResponse.json(message)
}
