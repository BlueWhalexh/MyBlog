const svgCopy =
  '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true"><path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path><path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path></svg>'
const svgCheck =
  '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true"><path fill-rule="evenodd" fill="rgb(63, 185, 80)" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>'

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }

  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "true")
    textarea.style.position = "fixed"
    textarea.style.top = "-9999px"
    textarea.style.left = "-9999px"
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    try {
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      ok ? resolve() : reject(new Error("copy command failed"))
    } catch (error) {
      document.body.removeChild(textarea)
      reject(error)
    }
  })
}

document.addEventListener("nav", () => {
  const els = document.getElementsByTagName("pre")
  for (let i = 0; i < els.length; i++) {
    els[i].querySelectorAll(":scope > .clipboard-button, :scope > .code-language").forEach((el) => el.remove())
    const codeBlock = els[i].getElementsByTagName("code")[0]
    if (codeBlock) {
      const source = (
        codeBlock.dataset.clipboard ? JSON.parse(codeBlock.dataset.clipboard) : codeBlock.innerText
      ).replace(/\n\n/g, "\n")
      const language = [...codeBlock.classList]
        .find((name) => name.startsWith("language-"))
        ?.replace("language-", "")
      if (language) {
        const label = document.createElement("span")
        label.className = "code-language"
        label.textContent = language
        els[i].prepend(label)
      }
      const button = document.createElement("button")
      button.className = "clipboard-button"
      button.type = "button"
      button.innerHTML = svgCopy
      button.ariaLabel = "复制代码"
      button.title = "复制代码"
      const label = document.createElement("span")
      label.className = "clipboard-label"
      label.textContent = "复制"
      button.append(label)

      function setButtonState(text: string, ok: boolean) {
        button.blur()
        button.innerHTML = ok ? svgCheck : svgCopy
        const stateLabel = document.createElement("span")
        stateLabel.className = "clipboard-label"
        stateLabel.textContent = text
        button.append(stateLabel)
        button.ariaLabel = text
        button.dataset.state = ok ? "copied" : "failed"
      }

      function resetButton() {
        button.innerHTML = svgCopy
        const resetLabel = document.createElement("span")
        resetLabel.className = "clipboard-label"
        resetLabel.textContent = "复制"
        button.append(resetLabel)
        button.ariaLabel = "复制代码"
        button.title = "复制代码"
        delete button.dataset.state
      }

      function onClick() {
        copyText(source).then(
          () => {
            setButtonState("已复制", true)
            setTimeout(resetButton, 1800)
          },
          (error) => {
            console.error(error)
            setButtonState("复制失败", false)
            setTimeout(resetButton, 1800)
          },
        )
      }
      button.addEventListener("click", onClick)
      window.addCleanup(() => button.removeEventListener("click", onClick))
      els[i].prepend(button)
    }
  }
})
