import { redirect } from "next/navigation"
import { getOperatorSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { SettingsApp } from "@/components/operator/SettingsApp"

export default async function SettingsPage() {
  const op = await getOperatorSession()
  if (!op) redirect("/login")

  const [settings, operators] = await Promise.all([
    db.workspaceSettings.findUnique({ where: { workspaceId: op.workspaceId } }),
    db.operator.findMany({
      where: { workspaceId: op.workspaceId },
      select: { id: true, name: true, email: true, avatar: true, isOnline: true, lastSeenAt: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return (
    <SettingsApp
      currentOperator={{ id: op.id, name: op.name, email: op.email, avatar: op.avatar, workspaceId: op.workspaceId }}
      initialSettings={settings}
      initialOperators={JSON.parse(JSON.stringify(operators))}
    />
  )
}
