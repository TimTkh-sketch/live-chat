export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

export function formatDate(date: string | Date) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Сегодня"
  if (d.toDateString() === yesterday.toDateString()) return "Вчера"
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
}
