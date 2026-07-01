"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

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
      setError("Ошибка соединения. Проверьте интернет и попробуйте снова.")
    } finally {
      setLoading(false)
    }
  }

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
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ваш@email.com"
                required
                autoComplete="email"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#FAFAFA", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "#F26522"}
                onBlur={e => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Пароль
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ width: "100%", padding: "12px 44px 12px 16px", borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#FAFAFA", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = "#F26522"}
                  onBlur={e => e.target.style.borderColor = "#E5E7EB"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 48, borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: "#F26522", color: "white", fontWeight: 700, fontSize: 15,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
                marginTop: 4,
              }}>
              {loading ? <><Loader size={18} style={{ animation: "spin 0.7s linear infinite" }} /> Вхожу...</> : "Войти →"}
            </button>
          </form>

          <div style={{ marginTop: 32, padding: 16, borderRadius: 12, background: "#F7F8FA", border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Нет доступа?</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
              Обратитесь к администратору — он создаст аккаунт в разделе <strong style={{ color: "#374151" }}>Настройки → Операторы</strong> и выдаст вам email и пароль.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
