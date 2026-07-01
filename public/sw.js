self.addEventListener("push", function (event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || "LiveChat", {
      body: data.body || "Новое сообщение",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.sessionId || "livechat",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/" },
    })
  )
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      return clients.openWindow(event.notification.data?.url || "/")
    })
  )
})
