function bootUXTweaks() {
  const progress = document.createElement("div")
  progress.className = "reading-progress"
  document.body.prepend(progress)
  window.addEventListener(
    "scroll",
    () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      progress.style.transform = `scaleX(${ratio})`
    },
    { passive: true },
  )

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

  document.querySelectorAll("pre").forEach((block) => {
    if (block.querySelector(".copy-code")) return
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
