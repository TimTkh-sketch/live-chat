import { redirect } from "next/navigation"
import { getOperatorSession } from "@/lib/auth"
import { OperatorApp } from "@/components/operator/OperatorApp"
import { db } from "@/lib/db"

export default async function Home() {
  const op = await getOperatorSession()
  if (!op) redirect("/login")

  const [sessions, operators, settings] = await Promise.all([
    db.chatSession.findMany({
      where: { workspaceId: op.workspaceId, status: "waiting" },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, operator: { select: { id: true, name: true } } },
    }),
    db.operator.findMany({
      where: { workspaceId: op.workspaceId },
      select: { id: true, name: true, avatar: true, isOnline: true },
    }),
    db.workspaceSettings.findUnique({ where: { workspaceId: op.workspaceId } }),
  ])

  return (
    <OperatorApp
      currentOperator={{ id: op.id, name: op.name, avatar: op.avatar, workspaceId: op.workspaceId, canManageSettings: op.canManageSettings, canManageOperators: op.canManageOperators, canManageChannels: op.canManageChannels, canManageReplies: op.canManageReplies }}
      initialSessions={JSON.parse(JSON.stringify(sessions))}
      operators={operators}
      settings={settings}
    />
  )
}
