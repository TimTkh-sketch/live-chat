import webpush from "web-push"
import { db } from "./db"

webpush.setVapidDetails(
  "mailto:timtkh333@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToWorkspace(
  workspaceId: string,
  payload: { title: string; body: string; sessionId?: string; url?: string }
) {
  const subs = await db.pushSubscription.findMany({
    where: { operator: { workspaceId } },
  })

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, url: payload.url ?? "/" })
      ).catch(() => {
        // Remove expired subscriptions silently
        db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      })
    )
  )
}
