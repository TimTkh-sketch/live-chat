import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPushToWorkspace } from "@/lib/push"

async function getOrCreateSession(workspaceId: string, userId: string, visitorName: string) {
  let session = await db.chatSession.findFirst({
    where: { channel: "vk", externalId: userId, status: { not: "closed" } },
  })
  if (!session) {
    session = await db.chatSession.create({
      data: {
        workspaceId,
        channel: "vk",
        externalId: userId,
        visitorName,
        visitorPage: "ВКонтакте",
        status: "active",
      },
    })
  }
  return session
}

async function resolveVkName(userId: string): Promise<string> {
  try {
    const token = process.env.VK_GROUP_TOKEN
    if (!token) return `VK #${userId}`
    const r = await fetch(`https://api.vk.com/method/users.get?user_ids=${userId}&access_token=${token}&v=5.199`)
    const data = await r.json()
    const u = data?.response?.[0]
    if (u) return `${u.first_name} ${u.last_name}`.trim()
  } catch {}
  return `VK #${userId}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  console.log("[VK webhook] type:", body.type, "group:", body.group_id)

  if (body.type === "confirmation") {
    return new NextResponse(process.env.VK_CONFIRMATION_CODE ?? "", {
      headers: { "Content-Type": "text/plain" },
    })
  }

  if (process.env.VK_SECRET && body.secret !== process.env.VK_SECRET) {
    return new NextResponse("ok")
  }

  const workspace = await db.workspace.findFirst()
  if (!workspace) return new NextResponse("ok")

  // Incoming message from user
  if (body.type === "message_new") {
    const msg = body.object?.message
    if (!msg?.text || !msg?.from_id) return new NextResponse("ok")

    const fromId = Number(msg.from_id)
    // Skip outgoing messages sent via VK app (from_id is negative = group)
    if (fromId < 0) return new NextResponse("ok")

    const userId = String(fromId)
    const text = msg.text as string
    const msgId = String(msg.id)

    const visitorName = await resolveVkName(userId)
    const session = await getOrCreateSession(workspace.id, userId, visitorName)

    await db.chatMessage.upsert({
      where: { externalId: `vk_${msgId}` },
      create: { sessionId: session.id, sender: "visitor", text, externalId: `vk_${msgId}` },
      update: {},
    })
    await db.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } })

    sendPushToWorkspace(workspace.id, {
      title: `💬 ${visitorName} (VK)`,
      body: text.length > 80 ? text.slice(0, 80) + "…" : text,
      sessionId: session.id,
      url: "/",
    }).catch(() => {})
  }

  // Operator replied via VK app
  // VK sends message_reply with object = message directly (no .message wrapper)
  if (body.type === "message_reply") {
    console.log("[VK] message_reply raw:", JSON.stringify(body.object).slice(0, 300))
    const msg = body.object?.message ?? body.object
    console.log("[VK] message_reply msg:", JSON.stringify(msg).slice(0, 200))
    if (!msg?.text) return new NextResponse("ok")

    const userId = String(msg.peer_id)
    const text = msg.text as string
    const msgId = String(msg.id)

    const session = await db.chatSession.findFirst({
      where: { channel: "vk", externalId: userId, status: { not: "closed" } },
    })
    if (!session) return new NextResponse("ok")

    await db.chatMessage.upsert({
      where: { externalId: `vk_${msgId}` },
      create: { sessionId: session.id, sender: "operator", text, externalId: `vk_${msgId}`, isRead: true },
      update: {},
    })
    await db.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } })
  }

  return new NextResponse("ok")
}
