"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader, Eye, EyeOff } from "lucide-react"

const FEATURES = [
  { icon: "💬", label: "Чаты в реальном времени" },
  { icon: "⚡", label: "Быстрые ответы" },
  { icon: "👥", label: "Несколько операторов" },
  { icon: "🔌", label: "Встраивается на любой сайт" },
]

export default function LoginPage() {
  const router    = useRouter()
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
      setError("Ошибка соединения. Проверьте интернет.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-bg">
      <div className="lp-card">

        {/* ── Логотип ─────────────────────── */}
        <div className="lp-logo">
          <MessageCircle size={26} color="white" />
        </div>
        <h1 className="lp-title">LiveChat</h1>
        <p className="lp-sub">Панель операторов поддержки</p>

        {/* ── Фичи ────────────────────────── */}
        <div className="lp-features">
          {FEATURES.map(f => (
            <div key={f.icon} className="lp-chip">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* ── Форма ───────────────────────── */}
        <form onSubmit={handleLogin} className="lp-form">
          <div className="lp-field">
            <label className="lp-label" htmlFor="lp-email">Email</label>
            <input
              id="lp-email"
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ваш@email.com" required autoComplete="email"
              className="lp-input"
            />
          </div>

          <div className="lp-field">
            <label className="lp-label" htmlFor="lp-pass">Пароль</label>
            <div className="lp-pass-wrap">
              <input
                id="lp-pass"
                type={showPass ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                className="lp-input lp-input-pass"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="lp-eye">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="lp-error">{error}</div>}

          <button type="submit" disabled={loading} className="lp-btn">
            {loading
              ? <><Loader size={18} style={{ animation: "spin .7s linear infinite" }} /> Вхожу...</>
              : "Войти →"}
          </button>
        </form>

        {/* ── Подсказка ───────────────────── */}
        <div className="lp-hint">
          <p className="lp-hint-h">Нет доступа?</p>
          <p className="lp-hint-t">
            Обратитесь к администратору — он создаст аккаунт в разделе{" "}
            <strong>Настройки → Операторы</strong>
          </p>
        </div>
      </div>

      <style>{`
        .lp-bg {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F0F2F5;
          padding: 24px 16px;
        }

        /* ── Card ── */
        .lp-card {
          background: #fff;
          border-radius: 20px;
          box-shadow:
            0 1px 3px rgba(0,0,0,.06),
            0 8px 24px rgba(0,0,0,.08),
            0 24px 56px rgba(0,0,0,.06);
          padding: 40px 40px 32px;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Logo ── */
        .lp-logo {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: #F26522;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
          box-shadow: 0 4px 14px rgba(242,101,34,.35);
        }
        .lp-title {
          font-size: 26px; font-weight: 800; color: #111;
          letter-spacing: -.5px; margin-bottom: 4px;
        }
        .lp-sub {
          font-size: 13px; color: #9CA3AF; margin-bottom: 24px;
        }

        /* ── Features ── */
        .lp-features {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-bottom: 28px;
          width: 100%;
        }
        .lp-chip {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 12px;
          background: #F7F8FA;
          border: 1px solid #E9EAEC;
          border-radius: 99px;
          font-size: 12px; font-weight: 500; color: #4B5563;
          white-space: nowrap;
        }

        /* ── Form ── */
        .lp-form {
          display: flex; flex-direction: column; gap: 14px;
          width: 100%;
        }
        .lp-field { display: flex; flex-direction: column; gap: 6px; }
        .lp-label { font-size: 12px; font-weight: 600; color: #374151; }

        .lp-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid #E5E7EB;
          background: #FAFAFA;
          font-size: 16px; color: #111;
          outline: none;
          box-sizing: border-box;
          transition: border-color .15s, box-shadow .15s;
          min-height: 48px;
        }
        .lp-input:focus {
          border-color: #F26522;
          box-shadow: 0 0 0 3px rgba(242,101,34,.12);
          background: #fff;
        }
        .lp-input-pass { padding-right: 48px; }

        .lp-pass-wrap { position: relative; }
        .lp-eye {
          position: absolute; right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #9CA3AF; display: flex; align-items: center;
          padding: 4px; border-radius: 6px;
        }
        .lp-eye:hover { color: #6B7280; }

        .lp-error {
          padding: 11px 14px;
          border-radius: 10px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          font-size: 13px;
        }

        .lp-btn {
          width: 100%; height: 50px;
          border-radius: 12px; border: none;
          background: #F26522;
          color: #fff; font-weight: 700; font-size: 16px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .15s, transform .1s, box-shadow .15s;
          margin-top: 2px;
          box-shadow: 0 2px 8px rgba(242,101,34,.3);
        }
        .lp-btn:hover:not(:disabled) {
          background: #E05510;
          box-shadow: 0 4px 16px rgba(242,101,34,.4);
        }
        .lp-btn:active:not(:disabled) { transform: scale(.99); }
        .lp-btn:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }

        /* ── Hint ── */
        .lp-hint {
          margin-top: 20px;
          padding: 13px 16px;
          border-radius: 12px;
          background: #F7F8FA;
          border: 1px solid #E9EAEC;
          width: 100%;
        }
        .lp-hint-h { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 3px; }
        .lp-hint-t { font-size: 12px; color: #9CA3AF; line-height: 1.6; }
        .lp-hint-t strong { color: #374151; }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .lp-card { padding: 32px 20px 28px; border-radius: 20px; }
          .lp-features { flex-direction: column; align-items: stretch; gap: 6px; }
          .lp-chip { border-radius: 10px; padding: 8px 12px; font-size: 13px; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
