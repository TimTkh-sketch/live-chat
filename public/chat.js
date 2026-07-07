;(function (w, d) {
  "use strict"

  var LC = w.__LiveChat || {}
  if (LC._loaded) return
  LC._loaded = true

  var scriptEl = d.currentScript || d.querySelector('script[src*="chat.js"]')
  var token    = scriptEl ? scriptEl.getAttribute("data-token") : null
  var baseUrl  = scriptEl ? (scriptEl.getAttribute("data-url") || scriptEl.src.replace(/\/chat\.js.*$/, "")) : ""

  if (!token) { console.warn("[LiveChat] data-token не указан"); return }

  w.__lc_token = token

  /* ── Styles ──────────────────────────── */
  var style = d.createElement("style")
  style.textContent = [
    "#lc-iframe{position:fixed;bottom:90px;right:20px;width:360px;height:520px;border:none;border-radius:20px;",
    "box-shadow:0 24px 64px rgba(0,0,0,0.18);z-index:2147483646;display:none;opacity:0;",
    "transition:opacity 0.2s ease,transform 0.25s cubic-bezier(0.16,1,0.3,1);",
    "transform:scale(0.92) translateY(8px);}",
    "#lc-iframe.lc-open{display:block;opacity:1;transform:scale(1) translateY(0);}",
    "#lc-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;",
    "border:none;cursor:pointer;z-index:2147483647;box-shadow:0 4px 20px rgba(0,0,0,0.2);",
    "display:flex;align-items:center;justify-content:center;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);}",
    "#lc-btn:hover{transform:scale(1.1);}",
    "#lc-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:99px;",
    "background:#ef4444;color:#fff;font-size:10px;font-weight:900;border:2px solid #fff;",
    "display:none;align-items:center;justify-content:center;padding:0 4px;}",
    "#lc-badge.lc-show{display:flex;}",
  ].join("")
  d.head.appendChild(style)

  /* ── iframe ──────────────────────────── */
  var iframe = d.createElement("iframe")
  iframe.id = "lc-iframe"
  iframe.allow = "microphone"
  iframe.title = "Чат поддержки"

  /* ── Button ─────────────────────────── */
  var btn = d.createElement("button")
  btn.id = "lc-btn"
  btn.title = "Написать нам"

  var badge = d.createElement("span")
  badge.id = "lc-badge"
  btn.appendChild(badge)

  /* ── SVG chat icon ───────────────────── */
  btn.insertAdjacentHTML("afterbegin", [
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"',
    ' fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "</svg>",
  ].join(""))

  var isOpen  = false
  var unread  = 0

  function setColor(color) {
    btn.style.background = color || "#F26522"
  }
  setColor("#F26522")

  function open() {
    isOpen = true
    iframe.classList.add("lc-open")
    unread = 0
    badge.textContent = "0"
    badge.classList.remove("lc-show")
  }

  function close() {
    isOpen = false
    iframe.classList.remove("lc-open")
  }

  btn.addEventListener("click", function () {
    isOpen ? close() : open()
  })

  /* ── PostMessage bridge ─────────────── */
  w.addEventListener("message", function (e) {
    if (!e.data || typeof e.data !== "object") return
    switch (e.data.type) {
      case "lc:close":   close(); break
      case "lc:unread":
        unread = e.data.count || 0
        if (unread > 0 && !isOpen) {
          badge.textContent = unread > 9 ? "9+" : String(unread)
          badge.classList.add("lc-show")
        }
        break
      case "lc:color":
        setColor(e.data.color)
        break
    }
  })

  /* ── Mount ───────────────────────────── */
  iframe.src = baseUrl + "/widget?token=" + encodeURIComponent(token)
  d.body.appendChild(iframe)
  d.body.appendChild(btn)

  w.__LiveChat = LC

}(window, document))
