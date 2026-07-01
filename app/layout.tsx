import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "LiveChat — Панель оператора",
  description: "Онлайн-чат для вашего сайта",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
