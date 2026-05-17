import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { extname, join, relative } from "node:path"

const root = process.cwd()
const contentDir = join(root, "content")
const publicDir = join(root, "public")
const distDir = join(root, "dist")
const siteUrl = (process.env.SITE_URL || "http://127.0.0.1:3010").replace(/\/$/, "")
const siteTitle = "xuehang 技术博客"
const siteDescription = "个人技术博客与 Obsidian 笔记公开站"

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;")
}

function slugFromPath(file) {
  const rel = relative(contentDir, file).replaceAll("\\", "/")
  return rel.replace(/\.md$/, "").replace(/(^|\/)index$/, "$1").replace(/\/$/, "") || "index"
}

function cleanValue(value) {
  const trimmed = value.trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  return trimmed.replace(/^["']|["']$/g, "")
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return [{}, raw]
  const end = raw.indexOf("\n---", 3)
  if (end === -1) return [{}, raw]
  const data = {}
  let currentKey = null
  const block = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).trimStart()

  for (const line of block.split(/\r?\n/)) {
    if (!line.trim()) continue
    const listItem = line.match(/^\s*-\s+(.+)$/)
    if (listItem && currentKey) {
      data[currentKey] = Array.isArray(data[currentKey]) ? data[currentKey] : []
      data[currentKey].push(cleanValue(listItem[1]))
      continue
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (pair) {
      currentKey = pair[1]
      data[currentKey] = pair[2] ? cleanValue(pair[2]) : []
    }
  }

  return [data, body]
}

function firstHeading(markdown) {
  const heading = markdown.split(/\r?\n/).find((line) => line.startsWith("# "))
  return heading ? heading.slice(2).trim() : ""
}

function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#`*\[\]()|>!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function readingMinutes(markdown) {
  const text = stripMarkdown(markdown)
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const words = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(cjk / 500 + words / 220))
}

function anchorId(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
  return cleaned || "section"
}

function assetUrl(name) {
  return `/obsidian-assets/${encodeURIComponent(name).replaceAll("%2F", "/")}`
}

function inlineMarkdown(value, slugMap) {
  return escapeHtml(value)
    .replace(/!\[\[([^\]]+)\]\]/g, (_, target) => `<img class="note-image" src="${assetUrl(target.trim())}" alt="${escapeHtml(target.trim())}">`)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, label) => {
      const href = slugMap.get(target.trim()) || `/${target.trim().replace(/\.md$/, "")}/`
      return `<a class="internal-link" href="${href}">${escapeHtml(label.trim())}</a>`
    })
    .replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
      const href = slugMap.get(target.trim()) || `/${target.trim().replace(/\.md$/, "")}/`
      return `<a class="internal-link" href="${href}">${escapeHtml(target.trim())}</a>`
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
}

function markdownToHtml(markdown, slugMap) {
  const lines = markdown.split(/\r?\n/)
  const html = []
  let inCode = false
  let inTable = false
  let inList = false
  let listType = ""

  const closeTable = () => {
    if (inTable) {
      html.push("</tbody></table>")
      inTable = false
    }
  }
  const closeList = () => {
    if (inList) {
      html.push(`</${listType}>`)
      inList = false
      listType = ""
    }
  }
  const openList = (type) => {
    if (inList && listType !== type) closeList()
    if (!inList) {
      html.push(`<${type}>`)
      inList = true
      listType = type
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const fence = line.match(/^```(\S*)/)
    if (fence) {
      closeTable()
      closeList()
      const lang = fence[1] ? ` language-${escapeHtml(fence[1])}` : ""
      html.push(inCode ? "</code></pre></div>" : `<div class="code-block"><button class="copy-code" type="button" data-copy-code>复制</button><pre><code class="${lang.trim()}">`)
      inCode = !inCode
      continue
    }
    if (inCode) {
      html.push(`${escapeHtml(line)}\n`)
      continue
    }
    if (/^\|(.+)\|$/.test(line.trim())) {
      closeList()
      const cells = line.trim().slice(1, -1).split("|").map((cell) => inlineMarkdown(cell.trim(), slugMap))
      const next = lines[i + 1] || ""
      if (!inTable) {
        html.push(`<table><thead><tr>${cells.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>`)
        inTable = true
        if (/^\|[\s:-]+\|/.test(next.trim())) i += 1
      } else {
        html.push(`<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
      }
      continue
    }
    closeTable()
    if (!line.trim()) {
      closeList()
      continue
    }
    const taskItem = line.match(/^-\s+\[([ xX])\]\s+(.+)$/)
    if (taskItem) {
      openList("ul")
      const checked = taskItem[1].toLowerCase() === "x" ? " checked" : ""
      html.push(`<li class="task-list-item"><input type="checkbox" disabled${checked}> ${inlineMarkdown(taskItem[2], slugMap)}</li>`)
      continue
    }
    const bulletItem = line.match(/^[-*+]\s+(.+)$/)
    if (bulletItem) {
      openList("ul")
      html.push(`<li>${inlineMarkdown(bulletItem[1], slugMap)}</li>`)
      continue
    }
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/)
    if (orderedItem) {
      openList("ol")
      html.push(`<li>${inlineMarkdown(orderedItem[1], slugMap)}</li>`)
      continue
    }
    closeList()

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const text = heading[2].trim()
      html.push(`<h${level} id="${anchorId(text)}">${inlineMarkdown(text, slugMap)}</h${level}>`)
    } else if (line.startsWith("> ")) {
      html.push(`<blockquote>${inlineMarkdown(line.slice(2), slugMap)}</blockquote>`)
    } else {
      html.push(`<p>${inlineMarkdown(line, slugMap)}</p>`)
    }
  }

  closeTable()
  closeList()
  return html.join("\n")
}

function extractLinks(markdown) {
  return [...markdown.matchAll(/\[\[([^\]|!]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim())
}

function extractToc(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{2,4})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => {
      const text = match[2].trim()
      return { text, id: anchorId(text), level: match[1].length }
    })
}

async function collectMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await collectMarkdown(full))
    if (entry.isFile() && extname(entry.name) === ".md") files.push(full)
  }
  return files
}

function categoryOf(page) {
  if (page.slug.startsWith("notes/")) return "学习笔记"
  if (page.slug.startsWith("posts/")) return "技术文章"
  if (page.slug.startsWith("projects/")) return "项目复盘"
  if (page.slug.startsWith("imported/")) return "同步笔记"
  if (page.slug === "index") return "入口"
  return "笔记"
}

function explorerItem(page, activeUrl) {
  return `<a class="${page.url === activeUrl ? "active" : ""}" href="${page.url}"><span>${escapeHtml(page.title)}</span><small>${page.date || ""}</small></a>`
}

function insertTree(root, parts, page) {
  let node = root
  for (const part of parts.slice(0, -1)) {
    if (!node.children.has(part)) node.children.set(part, { children: new Map(), pages: [] })
    node = node.children.get(part)
  }
  node.pages.push(page)
}

function renderExplorerNode(name, node, activeUrl, depth = 0) {
  const childHtml = [...node.children.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([childName, childNode]) => renderExplorerNode(childName, childNode, activeUrl, depth + 1))
    .join("")
  const sortedPages = node.pages.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"))
  const visiblePages = []
  const activePage = sortedPages.find((page) => page.url === activeUrl)
  if (activePage) visiblePages.push(activePage)
  for (const page of sortedPages) {
    if (visiblePages.length >= 40) break
    if (page.url !== activeUrl) visiblePages.push(page)
  }
  const pageHtml = visiblePages
    .map((page) => explorerItem(page, activeUrl))
    .join("")
  const more = sortedPages.length > visiblePages.length ? `<a class="more-link" href="/posts/"><span>查看更多 ${sortedPages.length - visiblePages.length} 篇</span><small>使用文章页或搜索进入</small></a>` : ""
  const hasActive = pageHtml.includes('class="active"') || childHtml.includes('class="active"')
  const open = depth <= 1 || hasActive ? " open" : ""
  return `<details class="tree-node depth-${depth}"${open}><summary>${escapeHtml(name)}</summary><div class="explorer-links">${childHtml}${pageHtml}${more}</div></details>`
}

function explorerTree(pages, activeUrl) {
  const importedRoot = { children: new Map(), pages: [] }
  const groups = new Map()
  for (const page of pages) {
    if (page.slug.startsWith("imported/")) {
      const parts = page.slug.replace(/^imported\//, "").split("/").filter(Boolean)
      insertTree(importedRoot, parts.length ? parts : [page.title], page)
      continue
    }
    const group = categoryOf(page)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(page)
  }
  const grouped = [...groups.entries()].map(([group, items]) => {
    const visible = items.slice(0, 36)
    const links = visible.map((page) => explorerItem(page, activeUrl)).join("")
    const more = items.length > visible.length ? `<a class="more-link" href="/posts/"><span>查看更多 ${items.length - visible.length} 篇</span><small>使用文章页或搜索进入</small></a>` : ""
    return `<details open><summary>${group}</summary><div class="explorer-links">${links}${more}</div></details>`
  }).join("")
  const imported = importedRoot.children.size || importedRoot.pages.length
    ? renderExplorerNode("同步笔记", importedRoot, activeUrl)
    : ""
  return `${grouped}${imported}`
}

function graphSubset(pages, slugMap, activeUrl, limit) {
  if (!activeUrl) return pages.slice(0, limit)
  const active = pages.find((page) => page.url === activeUrl)
  if (!active) return pages.slice(0, limit)
  const wanted = new Set([active.url])
  for (const link of active.links) {
    const url = slugMap.get(link)
    if (url) wanted.add(url)
  }
  for (const page of pages) {
    if (page.links.some((link) => slugMap.get(link) === activeUrl)) wanted.add(page.url)
  }
  const selected = pages.filter((page) => wanted.has(page.url))
  for (const page of pages) {
    if (selected.length >= limit) break
    if (!wanted.has(page.url)) selected.push(page)
  }
  return selected.slice(0, limit)
}

function renderGraphSvg(pages, slugMap, activeUrl = "", limit = 32) {
  const visiblePages = graphSubset(pages, slugMap, activeUrl, limit)
  const nodes = visiblePages.map((page, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, visiblePages.length)
    const radius = visiblePages.length > 4 ? 88 : 70
    return { ...page, x: 120 + Math.cos(angle) * radius, y: 102 + Math.sin(angle) * radius }
  })
  const byUrl = new Map(nodes.map((node) => [node.url, node]))
  const lines = []
  for (const node of nodes) {
    for (const link of node.links) {
      const target = byUrl.get(slugMap.get(link))
      if (target) lines.push(`<line x1="${node.x}" y1="${node.y}" x2="${target.x}" y2="${target.y}" />`)
    }
  }
  const circles = nodes.map((node) => `<a href="${node.url}"><circle class="${node.url === activeUrl ? "active" : ""}" cx="${node.x}" cy="${node.y}" r="${node.url === activeUrl ? 8 : 6}"><title>${escapeHtml(node.title)}</title></circle></a>`).join("")
  const more = pages.length > visiblePages.length ? `<p class="graph-note">显示 ${visiblePages.length}/${pages.length} 个节点，避免大 vault 页面卡顿。</p>` : ""
  return `<svg class="graph-map" viewBox="0 0 240 204" role="img" aria-label="笔记关系图">${lines.join("")}${circles}</svg>${more}`
}

function relatedPages(page, pages) {
  return pages
    .filter((candidate) => candidate.url !== page.url)
    .map((candidate) => ({ ...candidate, score: candidate.tags.filter((tag) => page.tags.includes(tag)).length }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
}

function baseTemplate({ title, description = siteDescription, activeUrl = "/", pages, slugMap, main, right }) {
  const absoluteUrl = `${siteUrl}${activeUrl === "/" ? "" : activeUrl}`
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${siteTitle}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${absoluteUrl}">
  <link rel="alternate" type="application/rss+xml" title="${siteTitle}" href="/feed.xml">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${absoluteUrl}">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="reading-progress" data-reading-progress></div>
  <header class="site-header">
    <div class="topbar">
      <a class="brand" href="/"><span class="brand-mark"><img src="/avatar.png" alt="xuehang avatar"></span><span>${siteTitle}</span></a>
      <nav class="nav" aria-label="主导航">
        <a class="${activeUrl === "/" ? "active" : ""}" href="/">首页</a>
        <a class="${activeUrl === "/posts/" ? "active" : ""}" href="/posts/">文章</a>
        <a class="${activeUrl === "/tags/" ? "active" : ""}" href="/tags/">标签</a>
        <a class="${activeUrl === "/graph/" ? "active" : ""}" href="/graph/">图谱</a>
        <a href="/feed.xml">RSS</a>
      </nav>
      <div class="toolbar">
        <button class="theme-dot paper" type="button" data-theme-button="paper" aria-label="Paper 主题"></button>
        <button class="theme-dot dusk" type="button" data-theme-button="dusk" aria-label="Dusk 主题"></button>
        <button class="reader-toggle" type="button" data-reader-toggle aria-label="切换阅读模式">阅读</button>
      </div>
    </div>
  </header>
  <main class="shell">
    <aside class="left-rail" aria-label="内容导航">
      <div class="rail-label">Finder</div>
      ${explorerTree(pages, activeUrl)}
    </aside>
    <section class="content">${main}</section>
    <aside class="right-rail">${right}</aside>
  </main>
  <nav class="reading-tools" aria-label="阅读工具">
    <button type="button" data-scroll-top title="回到顶部" aria-label="回到顶部">↑</button>
    <button type="button" data-scroll-bottom title="跳到底部" aria-label="跳到底部">↓</button>
  </nav>
  <footer class="site-footer">Quartz-ready local prototype · Git push to publish · private notes stay outside content/</footer>
  <script src="/app.js" type="module"></script>
</body>
</html>`
}

function macWindow(title, content) {
  return `<section class="mac-window">
    <div class="window-bar"><span></span><span></span><span></span><strong>${escapeHtml(title)}</strong></div>
    <div class="window-body">${content}</div>
  </section>`
}

function homeIntro(pages) {
  const articleCount = pages.filter((page) => page.url !== "/").length
  const tagCount = new Set(pages.flatMap((page) => page.tags)).size
  const linkCount = pages.reduce((sum, page) => sum + page.links.length, 0)
  return `<section class="hero">
    <div>
      <p class="eyebrow">Obsidian Garden · Mac-inspired Workspace</p>
      <h1>把学习、项目和面试准备，整理成一座可搜索、可探索、也足够好看的技术花园。</h1>
      <p>保留数字花园的反链、图谱和文件树，同时控制动效和阴影成本，让内容多起来以后仍然顺滑。</p>
    </div>
    <dl class="hero-stats" aria-label="站点统计">
      <div class="profile-card"><dt><img src="/avatar.png" alt="xuehang avatar"></dt><dd>xuehang</dd></div>
      <div><dt>${articleCount}</dt><dd>公开内容</dd></div>
      <div><dt>${tagCount}</dt><dd>标签</dd></div>
      <div><dt>${linkCount}</dt><dd>内部链接</dd></div>
    </dl>
  </section>`
}

function sidebarContent({ pages, page, backlinks = [], related = [], slugMap }) {
  const latest = pages.slice(0, 6).map((item) => `<a class="list-link" href="${item.url}"><strong>${escapeHtml(item.title)}</strong><span>${item.date || ""}</span></a>`).join("")
  const toc = page?.toc?.length ? page.toc.map((item) => `<a class="list-link toc-level-${item.level}" href="#${item.id}"><strong>${escapeHtml(item.text)}</strong></a>`).join("") : '<p class="empty-state">本页暂无二级到四级标题。</p>'
  const back = backlinks.length ? backlinks.map((item) => `<a class="list-link" href="${item.url}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description || "关联笔记")}</span></a>`).join("") : '<p class="empty-state">暂无反链。写作时用 [[页面名]] 连接笔记。</p>'
  const relatedLinks = related.length ? related.map((item) => `<a class="list-link" href="${item.url}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description || item.date || "")}</span></a>`).join("") : '<p class="empty-state">暂无相关内容。</p>'

  return `<section class="panel search-panel">
      <div class="panel-title"><span>全站搜索</span><kbd>Ctrl K</kbd></div>
      <input class="search-box" data-search-input type="search" placeholder="搜索笔记、标签、摘要">
      <div class="search-results" data-search-results></div>
    </section>
    <section class="panel"><h2>本页目录</h2>${toc}</section>
    <section class="panel"><h2>最新内容</h2>${latest}</section>
    <section class="panel"><h2>相关内容</h2>${relatedLinks}</section>
    <section class="panel"><h2>反链</h2>${back}</section>
    <section class="panel graph-panel"><h2>局部图谱</h2>${renderGraphSvg(pages, slugMap, page?.url || "")}</section>`
}

function pageTemplate({ page, body, pages, backlinks, related, slugMap }) {
  const tagLinks = page.tags.map((tag) => `<a class="tag" href="/tags/${encodeURIComponent(tag)}/">#${escapeHtml(tag)}</a>`).join("")
  const articleBody = `<article class="article">
    <div class="article-kicker">${categoryOf(page)} · ${escapeHtml(page.date || "未标注日期")} · ${page.readingMinutes} min read</div>
    <h1>${escapeHtml(page.title)}</h1>
    ${page.description ? `<p class="lede">${escapeHtml(page.description)}</p>` : ""}
    <div class="tag-row">${tagLinks}</div>
    <div class="article-body">${body}</div>
  </article>`
  const main = `${page.url === "/" ? homeIntro(pages) : ""}${macWindow(page.url === "/" ? "Garden Home" : "Reading Pane", articleBody)}`
  return baseTemplate({ title: page.title, description: page.description, activeUrl: page.url, pages, slugMap, main, right: sidebarContent({ pages, page, backlinks, related, slugMap }) })
}

function listTemplate({ title, description, activeUrl, pages, slugMap, rows }) {
  const article = macWindow(title, `<article class="article"><div class="article-kicker">Collection</div><h1>${escapeHtml(title)}</h1><p class="lede">${escapeHtml(description)}</p><div class="note-grid">${rows}</div></article>`)
  return baseTemplate({ title, description, activeUrl, pages, slugMap, main: article, right: `<section class="panel graph-panel"><h2>全局图谱</h2>${renderGraphSvg(pages, slugMap, activeUrl)}</section>` })
}

function postsTemplate(pages, slugMap) {
  const rows = pages.filter((page) => page.slug !== "index").map((page) => `<a class="note-card" href="${page.url}"><strong>${escapeHtml(page.title)}</strong><span>${escapeHtml(page.description || "")}</span><small>${page.date || ""} · ${page.readingMinutes} min read</small></a>`).join("")
  return listTemplate({ title: "文章", description: "所有公开技术博客、学习笔记和项目复盘。", activeUrl: "/posts/", pages, slugMap, rows })
}

function tagIndexTemplate(tags, pages, slugMap, activeUrl = "/tags/") {
  const rows = [...tags.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-CN")).map(([tag, tagPages]) => `<section class="tag-section"><h2>#${escapeHtml(tag)}</h2>${tagPages.map((page) => `<a class="note-card compact" href="${page.url}"><strong>${escapeHtml(page.title)}</strong><span>${escapeHtml(page.description || page.date || "")}</span></a>`).join("")}</section>`).join("")
  return listTemplate({ title: "标签", description: "按主题进入学习笔记、技术文章和项目复盘。", activeUrl, pages, slugMap, rows })
}

function graphTemplate(pages, slugMap) {
  const rows = pages.map((page) => `<li><a href="${page.url}">${escapeHtml(page.title)}</a><span>${page.links.length ? `连接到 ${escapeHtml(page.links.join(", "))}` : "暂无外链"}</span></li>`).join("")
  return listTemplate({ title: "图谱", description: "查看 Obsidian 双链形成的知识网络。", activeUrl: "/graph/", pages, slugMap, rows: `${renderGraphSvg(pages, slugMap, "", 96)}<ol class="graph-list">${rows}</ol>` })
}

async function copyPublic() {
  const entries = await readdir(publicDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    await writeFile(join(distDir, entry.name), await readFile(join(publicDir, entry.name)))
  }
}

async function writeFeed(pages) {
  const items = pages.filter((page) => page.slug !== "index").slice(0, 20).map((page) => `<item><title>${escapeXml(page.title)}</title><link>${siteUrl}${page.url}</link><guid>${siteUrl}${page.url}</guid><pubDate>${new Date(page.date || Date.now()).toUTCString()}</pubDate><description>${escapeXml(page.description || stripMarkdown(page.markdown).slice(0, 180))}</description></item>`).join("\n")
  await writeFile(join(distDir, "feed.xml"), `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>${siteTitle}</title><link>${siteUrl}</link><description>${siteDescription}</description>${items}</channel></rss>`)
}

async function writeSitemap(pages) {
  const urls = [...pages.map((page) => page.url), "/posts/", "/tags/", "/graph/"]
  const sitemap = `<?xml version="1.0" encoding="UTF-8" ?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${siteUrl}${url === "/" ? "" : url}</loc></url>`).join("\n")}\n</urlset>`
  await writeFile(join(distDir, "sitemap.xml"), sitemap)
  await writeFile(join(distDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)
}

async function build() {
  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })
  await copyPublic()

  const files = await collectMarkdown(contentDir)
  const parsed = []
  const slugMap = new Map()

  for (const file of files) {
    const raw = await readFile(file, "utf8")
    const [frontmatter, markdown] = parseFrontmatter(raw)
    if (frontmatter.draft === true) continue
    const slug = slugFromPath(file)
    const url = slug === "index" ? "/" : `/${slug}/`
    const aliases = [slug, `${slug}.md`, relative(contentDir, file).replaceAll("\\", "/").replace(/\.md$/, "")]
    for (const alias of aliases) slugMap.set(alias, url)
    parsed.push({
      file,
      slug,
      url,
      markdown,
      title: frontmatter.title || firstHeading(markdown) || slug,
      date: frontmatter.date || "",
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      description: frontmatter.description || "",
      links: extractLinks(markdown),
      toc: extractToc(markdown),
      readingMinutes: readingMinutes(markdown)
    })
  }

  parsed.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const tags = new Map()
  for (const page of parsed) {
    for (const tag of page.tags) {
      if (!tags.has(tag)) tags.set(tag, [])
      tags.get(tag).push(page)
    }
  }

  for (const page of parsed) {
    const backlinks = parsed.filter((candidate) => candidate.links.some((link) => slugMap.get(link) === page.url))
    const related = relatedPages(page, parsed)
    const body = markdownToHtml(page.markdown.replace(/^# .+$/m, "").trim(), slugMap)
    const html = pageTemplate({ page, body, pages: parsed, backlinks, related, slugMap })
    const outDir = page.url === "/" ? distDir : join(distDir, page.slug)
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, "index.html"), html)
  }

  await mkdir(join(distDir, "posts"), { recursive: true })
  await writeFile(join(distDir, "posts", "index.html"), postsTemplate(parsed, slugMap))
  await mkdir(join(distDir, "tags"), { recursive: true })
  await writeFile(join(distDir, "tags", "index.html"), tagIndexTemplate(tags, parsed, slugMap))
  for (const [tag, tagPages] of tags) {
    const safeTag = encodeURIComponent(tag)
    await mkdir(join(distDir, "tags", safeTag), { recursive: true })
    await writeFile(join(distDir, "tags", safeTag, "index.html"), tagIndexTemplate(new Map([[tag, tagPages]]), parsed, slugMap, `/tags/${safeTag}/`))
  }
  await mkdir(join(distDir, "graph"), { recursive: true })
  await writeFile(join(distDir, "graph", "index.html"), graphTemplate(parsed, slugMap))

  const searchIndex = parsed.map((page) => ({ title: page.title, url: page.url, date: page.date, tags: page.tags, description: page.description, readingMinutes: page.readingMinutes, text: stripMarkdown(page.markdown).slice(0, 3000) }))
  await writeFile(join(distDir, "search-index.json"), JSON.stringify(searchIndex, null, 2))
  await writeFeed(parsed)
  await writeSitemap(parsed)
  console.log(`Built ${parsed.length} pages into dist/`)
}

await build()
