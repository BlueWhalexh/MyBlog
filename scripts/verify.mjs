import { readFile, readdir, stat } from "node:fs/promises"
import { join } from "node:path"

const root = process.cwd()
const outDir = join(root, "public")
const requiredFiles = [
  "index.html",
  "index.xml",
  "sitemap.xml",
  "404.html",
  "prescript.js",
  "postscript.js",
  "index.css",
  "favicon.ico",
]

async function exists(file) {
  try {
    const info = await stat(join(outDir, file))
    return info.isFile()
  } catch {
    return false
  }
}

async function collectHtml(dir = outDir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== "static") files.push(...await collectHtml(full))
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(full)
  }
  return files
}

function fail(message) {
  console.error(`FAIL ${message}`)
  process.exitCode = 1
}

for (const file of requiredFiles) {
  if (!(await exists(file))) fail(`missing ${file}`)
}

const htmlFiles = await collectHtml()
if (htmlFiles.length < 4) fail(`expected at least 4 HTML files, found ${htmlFiles.length}`)

for (const file of htmlFiles.slice(0, 20)) {
  const html = await readFile(file, "utf8")
  if (!html.includes("<title>")) fail(`${file} missing title`)
}

const sitemap = await readFile(join(outDir, "sitemap.xml"), "utf8")
const sitemapUrls = (sitemap.match(/<loc>/g) || []).length
if (sitemapUrls < 10) fail(`sitemap has only ${sitemapUrls} URLs, expected 10+`)

const rss = await readFile(join(outDir, "index.xml"), "utf8")
if (!rss.includes("<rss") || !rss.includes("<channel>")) fail("invalid RSS feed")

const homepage = await readFile(join(outDir, "index.html"), "utf8")
if (!homepage.includes("/index.xml")) fail("homepage missing RSS link")

if (!process.exitCode) console.log(`Verified ${htmlFiles.length} HTML files, ${sitemapUrls} sitemap URLs, RSS feed`)
