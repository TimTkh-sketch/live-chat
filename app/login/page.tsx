"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router  = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || "Ошибка входа"); return }
      router.push("/")
      router.refresh()
    } catch {
      setError("Ошибка соединения. Проверьте интернет.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (dark?: boolean) => ({
    width: "100%",
    padding: dark ? "14px 16px" : "12px 16px",
    borderRadius: 14,
    border: dark ? "1.5px solid rgba(255,255,255,0.1)" : "1.5px solid #E5E7EB",
    background: dark ? "rgba(255,255,255,0.06)" : "#FAFAFA",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box" as const,
    color: dark ? "white" : "#111",
    transition: "border-color 0.15s",
  })

  /* ══════════════════════════════════════
      MOBILE DESIGN
  ══════════════════════════════════════ */
  if (isMobile) {
    return (
      <div style={{
        minHeight: "100svh", display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #1a0a2e 0%, #0F0F1A 35%, #0a1020 100%)",
        overflow: "hidden", position: "relative",
      }}>
        {/* Декоративные орбы */}
        <div style={{ position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,101,34,0.25) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 200, left: "30%", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Логотип */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 24px", zIndex: 1 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24, marginBottom: 20,
            background: "linear-gradient(135deg, #F26522 0%, #FF8C42 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 40px rgba(242,101,34,0.45), 0 0 0 1px rgba(242,101,34,0.2)",
          }}>
            <MessageCircle size={38} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 34, fontWeight: 900, letterSpacing: -1, marginBottom: 6 }}>LiveChat</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center" }}>Панель операторов поддержки</p>

          {/* Фичи */}
          <div style={{ marginTop: 32, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {["💬 Чаты в реальном времени", "⚡ Быстрые ответы", "📲 Push-уведомления"].map(f => (
              <span key={f} style={{
                fontSize: 11, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: 99,
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Форма — bottom sheet */}
        <div style={{
          background: "rgba(18,18,30,0.95)", backdropFilter: "blur(24px)",
          borderRadius: "28px 28px 0 0",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          padding: "28px 24px 40px",
          zIndex: 2,
        }}>
          {/* Рукоятка */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px" }} />

          <h2 style={{ color: "white", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Вход в систему</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 24 }}>Введите данные от вашего аккаунта</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ваш@email.com" required autoComplete="email"
                style={inputStyle(true)}
                onFocus={e => e.target.style.borderColor = "#F26522"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Пароль
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{ ...inputStyle(true), paddingRight: 48 }}
                  onFocus={e => e.target.style.borderColor = "#F26522"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex" }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: "100%", height: 54, borderRadius: 16, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "rgba(242,101,34,0.5)" : "linear-gradient(135deg, #F26522 0%, #FF8C42 100%)",
                color: "white", fontWeight: 800, fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: loading ? "none" : "0 8px 24px rgba(242,101,34,0.35)",
                transition: "all 0.2s", marginTop: 4,
              }}>
              {loading ? <><Loader size={18} style={{ animation: "spin 0.7s linear infinite" }} /> Вхожу...</> : "Войти →"}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Нет доступа?</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              Обратитесь к администратору — он создаст аккаунт в разделе{" "}
              <strong style={{ color: "rgba(255,255,255,0.55)" }}>Настройки → Операторы</strong>
            </p>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ══════════════════════════════════════
      DESKTOP DESIGN (without changes)
  ══════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#F7F8FA" }}>
      {/* Left — branding */}
      <div style={{ flex: 1, background: "#1C1C28", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F26522", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <MessageCircle size={28} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 800, marginBottom: 12, textAlign: "center" }}>LiveChat</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
          Панель операторов для работы с обращениями клиентов в реальном времени
        </p>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 300 }}>
          {[
            { icon: "💬", text: "Входящие чаты с сайта" },
            { icon: "⚡", text: "Быстрые ответы одним кликом" },
            { icon: "👥", text: "Несколько операторов" },
            { icon: "🔌", text: "Встраивается на любой сайт" },
          ].map(item => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — login form */}
      <div style={{ width: 440, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 6 }}>Вход в систему</h2>
          <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 32 }}>
            Введите email и пароль, которые выдал администратор
          </p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ваш@email.com" required autoComplete="email"
                style={inputStyle()} onFocus={e => e.target.style.borderColor = "#F26522"} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Пароль</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{ ...inputStyle(), padding: "12px 44px 12px 16px" }}
                  onFocus={e => e.target.style.borderColor = "#F26522"} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: "100%", height: 48, borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "#F26522", color: "white", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, transition: "opacity 0.15s", marginTop: 4 }}>
              {loading ? <><Loader size={18} style={{ animation: "spin 0.7s linear infinite" }} /> Вхожу...</> : "Войти →"}
            </button>
          </form>
          <div style={{ marginTop: 32, padding: 16, borderRadius: 12, background: "#F7F8FA", border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Нет доступа?</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
              Обратитесь к администратору — он создаст аккаунт в разделе <strong style={{ color: "#374151" }}>Настройки → Операторы</strong>
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
