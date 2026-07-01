export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: transparent; font-family: -apple-system, "Inter", sans-serif; -webkit-font-smoothing: antialiased; overflow: hidden; }
          ::-webkit-scrollbar { width: 3px; }
          ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
