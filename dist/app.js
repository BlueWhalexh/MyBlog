async function bootSearch() {
  const input = document.querySelector("[data-search-input]")
  const results = document.querySelector("[data-search-results]")
  if (!input || !results) return

  const response = await fetch("/search-index.json")
  const index = await response.json()

  function render(query) {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      results.innerHTML = '<p class="empty-state">输入关键词后会显示匹配的笔记。</p>'
      return
    }

    const tagOnly = normalized.startsWith("#")
    const needle = tagOnly ? normalized.slice(1) : normalized
    const matches = index
      .filter((item) => {
        const tags = item.tags.join(" ").toLowerCase()
        const haystack = `${item.title} ${item.description} ${tags} ${item.text}`.toLowerCase()
        return tagOnly ? tags.includes(needle) : haystack.includes(needle)
      })
      .slice(0, 8)

    results.innerHTML = matches.length
      ? matches.map((item) => `<a class="list-link" href="${item.url}"><strong>${item.title}</strong><span>${item.description || item.tags.map((tag) => `#${tag}`).join(" ")}</span></a>`).join("")
      : '<p class="empty-state">没有匹配内容。可以试试标签，例如 #Java。</p>'
  }

  render("")
  input.addEventListener("input", () => render(input.value))

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault()
      input.focus()
      input.select()
    }
  })
}

function bootReaderMode() {
  const toggle = document.querySelector("[data-reader-toggle]")
  if (!toggle) return

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("reader-mode")
    toggle.textContent = document.body.classList.contains("reader-mode") ? "退出阅读" : "阅读"
  })
}

function bootTheme() {
  const stored = localStorage.getItem("blog-theme")
  if (stored) document.body.dataset.theme = stored

  document.querySelectorAll("[data-theme-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.getAttribute("data-theme-button")
      if (!theme || theme === "paper") {
        document.body.removeAttribute("data-theme")
        localStorage.removeItem("blog-theme")
      } else {
        document.body.dataset.theme = theme
        localStorage.setItem("blog-theme", theme)
      }
    })
  })
}

function bootCodeCopy() {
  document.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.closest(".code-block")?.querySelector("code")
      if (!code) return
      await navigator.clipboard.writeText(code.innerText)
      const original = button.textContent
      button.textContent = "已复制"
      window.setTimeout(() => {
        button.textContent = original
      }, 1400)
    })
  })
}

function bootReadingTools() {
  const progress = document.querySelector("[data-reading-progress]")
  const top = document.querySelector("[data-scroll-top]")
  const bottom = document.querySelector("[data-scroll-bottom]")

  top?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }))
  bottom?.addEventListener("click", () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }))

  if (!progress) return
  const update = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    const max = document.documentElement.scrollHeight - document.documentElement.clientHeight
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0
    progress.style.transform = `scaleX(${ratio})`
  }
  update()
  window.addEventListener("scroll", update, { passive: true })
  window.addEventListener("resize", update)
}

bootTheme()
bootSearch()
bootReaderMode()
bootCodeCopy()
bootReadingTools()
