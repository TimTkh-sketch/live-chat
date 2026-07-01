"use client"

import { useState } from "react"
import {
  MessageCircle, ArrowLeft, Users, Settings2, Palette,
  Plus, Trash2, Edit3, Save, X, Eye, EyeOff,
  Check, Loader, Circle, Clock, ShieldCheck, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Operator {
  id: string; name: string; email: string; avatar: string | null
  isOnline: boolean; lastSeenAt: string | null; createdAt: string
}
interface ChatSettings {
  greeting: string; offlineText: string; primaryColor: string
  quickReplies: string[]; operatorName: string; operatorAvatar: string | null
}

const COLORS = ["#F26522","#6366F1","#0EA5E9","#10B981","#EF4444","#F59E0B","#8B5CF6","#EC4899","#14B8A6","#1a1a1a"]
const TABS = [
  { key: "widget",    label: "Виджет",    icon: Palette },
  { key: "operators", label: "Операторы", icon: Users },
  { key: "replies",   label: "Быстрые ответы", icon: Zap },
  { key: "account",  label: "Мой аккаунт", icon: ShieldCheck },
]

export function SettingsApp({
  currentOperator,
  initialSettings,
  initialOperators,
}: {
  currentOperator: { id: string; name: string; email: string; avatar: string | null; workspaceId: string }
  initialSettings: ChatSettings | null
  initialOperators: Operator[]
}) {
  const [tab, setTab] = useState("widget")

  /* ── Widget settings state ── */
  const [greeting,     setGreeting]     = useState(initialSettings?.greeting     ?? "Здравствуйте! Чем могу помочь? 😊")
  const [offlineText,  setOfflineText]  = useState(initialSettings?.offlineText  ?? "Мы сейчас офлайн. Оставьте сообщение!")
  const [color,        setColor]        = useState(initialSettings?.primaryColor ?? "#F26522")
  const [opName,       setOpName]       = useState(initialSettings?.operatorName ?? "Поддержка")
  const [savingWidget, setSavingWidget] = useState(false)
  const [savedWidget,  setSavedWidget]  = useState(false)

  /* ── Quick replies state ── */
  const [replies,      setReplies]      = useState<string[]>(initialSettings?.quickReplies ?? [])
  const [newReply,     setNewReply]     = useState("")
  const [editIdx,      setEditIdx]      = useState<number | null>(null)
  const [editVal,      setEditVal]      = useState("")
  const [savingReplies, setSavingReplies] = useState(false)
  const [savedReplies,  setSavedReplies]  = useState(false)

  /* ── Operators state ── */
  const [operators,   setOperators]   = useState<Operator[]>(initialOperators)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName,     setNewName]     = useState("")
  const [newEmail,    setNewEmail]    = useState("")
  const [newPass,     setNewPass]     = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [addingOp,    setAddingOp]    = useState(false)
  const [addError,    setAddError]    = useState("")

  /* ── My account state ── */
  const [myName,      setMyName]      = useState(currentOperator.name)
  const [myEmail,     setMyEmail]     = useState(currentOperator.email)
  const [myPass,      setMyPass]      = useState("")
  const [myPassConf,  setMyPassConf]  = useState("")
  const [showMyPass,  setShowMyPass]  = useState(false)
  const [savingMe,    setSavingMe]    = useState(false)
  const [savedMe,     setSavedMe]     = useState(false)
  const [meError,     setMeError]     = useState("")

  /* ════════════════════════════════
     Widget settings save
  ════════════════════════════════ */
  async function saveWidget() {
    setSavingWidget(true)
    await fetch("/api/workspace/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ greeting, offlineText, primaryColor: color, operatorName: opName }),
    })
    setSavingWidget(false)
    setSavedWidget(true)
    setTimeout(() => setSavedWidget(false), 2500)
  }

  /* ════════════════════════════════
     Quick replies save
  ════════════════════════════════ */
  async function saveReplies(list: string[]) {
    setSavingReplies(true)
    await fetch("/api/workspace/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quickReplies: list }),
    })
    setSavingReplies(false)
    setSavedReplies(true)
    setTimeout(() => setSavedReplies(false), 2000)
  }

  function addReply() {
    if (!newReply.trim()) return
    const list = [...replies, newReply.trim()]
    setReplies(list)
    setNewReply("")
    saveReplies(list)
  }

  function removeReply(i: number) {
    const list = replies.filter((_, idx) => idx !== i)
    setReplies(list)
    saveReplies(list)
  }

  function startEdit(i: number) { setEditIdx(i); setEditVal(replies[i]) }
  function saveEdit() {
    if (editIdx === null || !editVal.trim()) return
    const list = replies.map((r, i) => i === editIdx ? editVal.trim() : r)
    setReplies(list)
    setEditIdx(null)
    saveReplies(list)
  }

  /* ════════════════════════════════
     Add operator
  ════════════════════════════════ */
  async function addOperator() {
    if (!newName.trim() || !newEmail.trim() || !newPass.trim()) { setAddError("Заполните все поля"); return }
    setAddingOp(true); setAddError("")
    const r = await fetch("/api/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, password: newPass }),
    })
    const data = await r.json()
    if (!r.ok) { setAddError(data.error || "Ошибка"); setAddingOp(false); return }
    setOperators(prev => [...prev, { ...data, isOnline: false, lastSeenAt: null, createdAt: new Date().toISOString() }])
    setNewName(""); setNewEmail(""); setNewPass(""); setShowAddForm(false)
    setAddingOp(false)
  }

  async function deleteOperator(id: string) {
    if (!confirm("Удалить оператора?")) return
    const r = await fetch(`/api/operators/${id}`, { method: "DELETE" })
    if (r.ok) setOperators(prev => prev.filter(o => o.id !== id))
  }

  /* ════════════════════════════════
     My account save
  ════════════════════════════════ */
  async function saveMe() {
    setMeError("")
    if (myPass && myPass !== myPassConf) { setMeError("Пароли не совпадают"); return }
    setSavingMe(true)
    const body: Record<string, string> = { name: myName, email: myEmail }
    if (myPass) body.password = myPass
    await fetch(`/api/operators/${currentOperator.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSavingMe(false); setSavedMe(true)
    setMyPass(""); setMyPassConf("")
    setTimeout(() => setSavedMe(false), 2500)
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F7F8FA", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 240, background: "#1C1C28", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo + back */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 12, marginBottom: 16 }}>
            <ArrowLeft size={14} /> Назад к чатам
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={16} color="white" />
            </div>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Настройки</span>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ padding: "8px 8px", flex: 1 }}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                  background: tab === t.key ? "rgba(255,255,255,0.1)" : "transparent",
                  color: tab === t.key ? "white" : "rgba(255,255,255,0.45)",
                  fontSize: 13, fontWeight: tab === t.key ? 600 : 400, transition: "all 0.12s",
                }}>
                <Icon size={15} />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* Current operator */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {currentOperator.name[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "white", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentOperator.name}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentOperator.email}</p>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>

        {/* ══════ WIDGET TAB ══════ */}
        {tab === "widget" && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Настройки виджета</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Внешний вид и текст чата на сайте</p>

            <Card title="Имя и приветствие">
              <Label>Имя оператора / команды</Label>
              <Input value={opName} onChange={setOpName} placeholder="Поддержка" />

              <Label>Приветственное сообщение</Label>
              <Textarea value={greeting} onChange={setGreeting} placeholder="Здравствуйте! Чем могу помочь?" />

              <Label>Текст когда офлайн</Label>
              <Textarea value={offlineText} onChange={setOfflineText} placeholder="Мы сейчас офлайн..." />
            </Card>

            <Card title="Цвет виджета">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%", background: c,
                      border: color === c ? "3px solid #111" : "3px solid transparent",
                      cursor: "pointer", transition: "border 0.12s", outline: "none",
                      boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none",
                    }} />
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0 }} />
                  <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "monospace" }}>{color}</span>
                </div>
              </div>

              {/* Preview */}
              <div style={{ marginTop: 20, padding: 16, background: "#F0F2F5", borderRadius: 12, position: "relative", minHeight: 80 }}>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Предпросмотр</p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${color}55` }}>
                    <MessageCircle size={22} color="white" />
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 70, right: 16, background: color, color: "white", borderRadius: "12px 12px 2px 12px", padding: "8px 14px", fontSize: 13, maxWidth: 200 }}>
                  {greeting.slice(0, 40)}{greeting.length > 40 ? "…" : ""}
                </div>
              </div>
            </Card>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SaveBtn loading={savingWidget} saved={savedWidget} onClick={saveWidget} />
            </div>
          </div>
        )}

        {/* ══════ OPERATORS TAB ══════ */}
        {tab === "operators" && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Операторы</h1>
              <button onClick={() => { setShowAddForm(true); setAddError("") }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>
                <Plus size={15} /> Добавить оператора
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
              {operators.length} {operators.length === 1 ? "оператор" : operators.length < 5 ? "оператора" : "операторов"}
            </p>

            {/* Add form */}
            {showAddForm && (
              <div style={{ background: "white", borderRadius: 14, padding: 24, marginBottom: 20, border: "1.5px solid #E5E7EB", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Новый оператор</h3>
                  <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <Label>Имя</Label>
                    <Input value={newName} onChange={setNewName} placeholder="Иван Петров" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newEmail} onChange={setNewEmail} placeholder="ivan@example.com" type="email" />
                  </div>
                </div>
                <Label>Пароль</Label>
                <div style={{ position: "relative" }}>
                  <Input value={newPass} onChange={setNewPass} placeholder="Минимум 6 символов" type={showPass ? "text" : "password"} />
                  <button onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {addError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{addError}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={addOperator} disabled={addingOp}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: addingOp ? 0.7 : 1 }}>
                    {addingOp ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                    Создать
                  </button>
                  <button onClick={() => setShowAddForm(false)} style={{ padding: "9px 20px", borderRadius: 10, background: "transparent", color: "#6B7280", fontWeight: 500, fontSize: 13, border: "1px solid #E5E7EB", cursor: "pointer" }}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Operators list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {operators.map(op => (
                <div key={op.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: op.id === currentOperator.id ? color : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: op.id === currentOperator.id ? "white" : "#6B7280", flexShrink: 0, position: "relative" }}>
                    {op.avatar
                      ? <img src={op.avatar} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} alt="" />
                      : op.name[0].toUpperCase()}
                    <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: op.isOnline ? "#4ade80" : "#D1D5DB", border: "2px solid white" }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{op.name}</p>
                      {op.id === currentOperator.id && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${color}18`, color }}>ВЫ</span>
                      )}
                      {op.isOnline
                        ? <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 3 }}><Circle size={6} style={{ fill: "#4ade80", stroke: "none" }} /> Онлайн</span>
                        : <span style={{ fontSize: 10, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} /> {op.lastSeenAt ? `Был ${new Date(op.lastSeenAt).toLocaleDateString("ru-RU")}` : "Не заходил"}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{op.email}</p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {op.id !== currentOperator.id && (
                      <button onClick={() => deleteOperator(op.id)}
                        title="Удалить"
                        style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #FEE2E2", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", transition: "all 0.12s" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ QUICK REPLIES TAB ══════ */}
        {tab === "replies" && (
          <div style={{ maxWidth: 580 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Быстрые ответы</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>
              Кнопки которые видит клиент в чате и оператор в панели — одним кликом отправить готовый ответ
            </p>

            {/* Add */}
            <Card title="Добавить ответ">
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={newReply}
                  onChange={e => setNewReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addReply()}
                  placeholder="Например: Условия доставки"
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA" }}
                />
                <button onClick={addReply} disabled={!newReply.trim()}
                  style={{ padding: "10px 18px", borderRadius: 10, background: color, color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", opacity: newReply.trim() ? 1 : 0.5 }}>
                  <Plus size={16} />
                </button>
              </div>
            </Card>

            {/* List */}
            {replies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#D1D5DB" }}>
                <Zap size={32} style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: 14 }}>Нет быстрых ответов</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {replies.map((r, i) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: "1px solid #F3F4F6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <Zap size={14} color={color} style={{ flexShrink: 0 }} />
                    {editIdx === i ? (
                      <>
                        <input
                          autoFocus
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditIdx(null) }}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none" }}
                        />
                        <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a" }}><Check size={16} /></button>
                        <button onClick={() => setEditIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 14, color: "#374151" }}>{r}</span>
                        <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><Edit3 size={14} /></button>
                        <button onClick={() => removeReply(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {savedReplies && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
                <Check size={14} /> Сохранено
              </div>
            )}
          </div>
        )}

        {/* ══════ ACCOUNT TAB ══════ */}
        {tab === "account" && (
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Мой аккаунт</h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>Ваши личные данные и пароль</p>

            <Card title="Основная информация">
              <Label>Имя</Label>
              <Input value={myName} onChange={setMyName} placeholder="Ваше имя" />
              <Label>Email</Label>
              <Input value={myEmail} onChange={setMyEmail} placeholder="email@example.com" type="email" />
            </Card>

            <Card title="Смена пароля">
              <Label>Новый пароль</Label>
              <div style={{ position: "relative" }}>
                <Input value={myPass} onChange={setMyPass} placeholder="Оставьте пустым чтобы не менять" type={showMyPass ? "text" : "password"} />
                <button onClick={() => setShowMyPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  {showMyPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Label>Повторите пароль</Label>
              <Input value={myPassConf} onChange={setMyPassConf} placeholder="Повторите новый пароль" type="password" />
              {meError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{meError}</p>}
            </Card>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SaveBtn loading={savingMe} saved={savedMe} onClick={saveMe} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/* ── Small reusable components ── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: "22px 24px", marginBottom: 16, border: "1px solid #F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <h3 style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 18 }}>{title}</h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6, marginTop: 14 }}>{children}</p>
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA", boxSizing: "border-box" }}
    />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none", background: "#FAFAFA", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
    />
  )
}

function SaveBtn({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 12, background: saved ? "#16a34a" : "#111", color: "white", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", transition: "background 0.2s", opacity: loading ? 0.7 : 1 }}>
      {loading ? <Loader size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
      {loading ? "Сохраняю..." : saved ? "Сохранено!" : "Сохранить"}
    </button>
  )
}
