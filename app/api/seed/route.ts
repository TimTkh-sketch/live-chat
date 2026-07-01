import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET() {
  const existing = await db.workspace.findFirst()
  if (existing) return NextResponse.json({ ok: true, message: "Already seeded", workspace: existing })

  const workspace = await db.workspace.create({
    data: {
      name: "Мой магазин",
      slug: "my-shop",
      settings: {
        create: {
          greeting: "Здравствуйте! Чем могу помочь? 😊",
          quickReplies: ["Трейд-ин", "Условия рассрочки", "Получить скидку!"],
          primaryColor: "#F26522",
          operatorName: "Поддержка",
        },
      },
    },
  })

  const op = await db.operator.create({
    data: {
      workspaceId: workspace.id,
      name: "Тимур",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      isOnline: true,
    },
  })

  return NextResponse.json({ ok: true, workspace, operator: { id: op.id, email: op.email }, token: workspace.token })
}
