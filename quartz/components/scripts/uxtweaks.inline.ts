// Idempotent UX tweaks — safe for multiple invocations (SPA nav, re-renders)

function bootUXTweaks() {
  // ── Reading progress bar (create only once) ──
  let progress = document.querySelector(".reading-progress") as HTMLDivElement | null
  if (!progress) {
    progress = document.createElement("div")
    progress.className = "reading-progress"
    document.body.insertBefore(progress, document.body.firstChild)

    let ticking = false
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
          const max = document.documentElement.scrollHeight - window.innerHeight
          const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
          progress!.style.width = `${ratio * 100}%`
          ticking = false
        })
      },
      { passive: true },
    )
  }

  // ── Floating reading tools (create only once) ──
  if (!document.querySelector(".reading-tools")) {
    const tools = document.createElement("nav")
    tools.className = "reading-tools"
    tools.setAttribute("aria-label", "阅读工具")

    const topBtn = document.createElement("button")
    topBtn.innerHTML = "↑"
    topBtn.title = "回到顶部"
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }))

    const bottomBtn = document.createElement("button")
    bottomBtn.innerHTML = "↓"
    bottomBtn.title = "跳到底部"
    bottomBtn.addEventListener("click", () =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }),
    )

    tools.appendChild(topBtn)
    tools.appendChild(bottomBtn)
    document.body.appendChild(tools)
  }

  // ── Code copy buttons (idempotent per-block) ──
  document.querySelectorAll("pre").forEach((block) => {
    if (block.closest(".code-block")) return
    const wrapper = document.createElement("div")
    wrapper.className = "code-block"
    const btn = document.createElement("button")
    btn.className = "copy-code"
    btn.type = "button"
    btn.textContent = "复制"
    btn.addEventListener("click", async () => {
      const code = block.querySelector("code")
      if (!code) return
      await navigator.clipboard.writeText(code.innerText)
      btn.textContent = "已复制"
      setTimeout(() => {
        btn.textContent = "复制"
      }, 1400)
    })
    block.parentNode!.insertBefore(wrapper, block)
    wrapper.appendChild(btn)
    wrapper.appendChild(block)
  })
}

document.addEventListener("nav", bootUXTweaks)
bootUXTweaks()
