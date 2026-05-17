function setupReadingProgress() {
  document.querySelectorAll(".reading-progress").forEach((el) => el.remove())

  const bar = document.createElement("div")
  bar.className = "reading-progress"
  document.body.appendChild(bar)

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    bar.style.width = `${Math.min(100, Math.max(0, (scrollTop / max) * 100))}%`
  }

  update()
  window.addEventListener("scroll", update, { passive: true })
  window.addEventListener("resize", update)
  window.addCleanup(() => {
    window.removeEventListener("scroll", update)
    window.removeEventListener("resize", update)
    bar.remove()
  })
}

function setupBackToTop() {
  document.querySelectorAll(".back-to-top").forEach((el) => el.remove())

  const button = document.createElement("button")
  button.className = "back-to-top"
  button.type = "button"
  button.ariaLabel = "回到顶部"
  button.title = "回到顶部"
  button.textContent = "↑"
  document.body.appendChild(button)

  const update = () => {
    button.toggleAttribute("data-visible", window.scrollY > 520)
  }
  const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  update()
  button.addEventListener("click", goTop)
  window.addEventListener("scroll", update, { passive: true })
  window.addCleanup(() => {
    button.removeEventListener("click", goTop)
    window.removeEventListener("scroll", update)
    button.remove()
  })
}

function setupHeadingAnchors() {
  const headings = document.querySelectorAll<HTMLElement>("article h2[id], article h3[id], article h4[id]")
  for (const heading of headings) {
    if (heading.querySelector(":scope > .heading-anchor")) continue
    const anchor = document.createElement("a")
    anchor.className = "heading-anchor"
    anchor.href = `#${heading.id}`
    anchor.ariaLabel = "复制此标题链接"
    anchor.textContent = "#"
    heading.append(anchor)
  }
}

document.addEventListener("nav", () => {
  setupReadingProgress()
  setupBackToTop()
  setupHeadingAnchors()
})
