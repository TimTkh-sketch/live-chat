import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendPushToWorkspace } from "@/lib/push"

export async function POST(req: NextRequest) {
  const body = await req.json()

  // VK confirmation request
  if (body.type === "confirmation") {
    return new NextResponse(process.env.VK_CONFIRMATION_CODE ?? "", {
      headers: { "Content-Type": "text/plain" },
    })
  }

  // Verify secret
  if (process.env.VK_SECRET && body.secret !== process.env.VK_SECRET) {
    return new NextResponse("ok")
  }

  if (body.type !== "message_new") return new NextResponse("ok")

  const msg    = body.object?.message
  if (!msg?.text || !msg?.from_id) return new NextResponse("ok")

  const userId   = String(msg.from_id)
  const text     = msg.text as string

  const workspace = await db.workspace.findFirst()
  if (!workspace) return new NextResponse("ok")

  // Resolve VK user name
  let visitorName = `VK #${userId}`
  try {
    const token = process.env.VK_GROUP_TOKEN
    if (token) {
      const r = await fetch(
        `https://api.vk.com/method/users.get?user_ids=${userId}&access_token=${token}&v=5.199`
      )
      const data = await r.json()
      const u = data?.response?.[0]
      if (u) visitorName = `${u.first_name} ${u.last_name}`.trim()
    }
  } catch {}

  let session = await db.chatSession.findFirst({
    where: { channel: "vk", externalId: userId, status: { not: "closed" } },
  })

  if (!session) {
    session = await db.chatSession.create({
      data: {
        workspaceId: workspace.id,
        channel: "vk",
        externalId: userId,
        visitorName,
        visitorPage: "ВКонтакте",
        status: "waiting",
      },
    })
  }

  await db.chatMessage.create({
    data: { sessionId: session.id, sender: "visitor", text },
  })
  await db.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  sendPushToWorkspace(workspace.id, {
    title: `💬 ${visitorName} (VK)`,
    body: text.length > 80 ? text.slice(0, 80) + "…" : text,
    sessionId: session.id,
    url: "/",
  }).catch(() => {})

  return new NextResponse("ok")
}
