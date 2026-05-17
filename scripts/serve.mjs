// Lightweight static file server for production use
// Usage: node scripts/serve.mjs [port] [host]
import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { join, extname } from "node:path"
import { existsSync, statSync } from "node:fs"

const PORT = parseInt(process.argv[2] || "3010")
const HOST = process.argv[3] || "0.0.0.0"
const root = join(import.meta.dirname, "..", "public")

const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain",
}

createServer(async (req, res) => {
  let url = new URL(req.url, "http://localhost").pathname
  try {
    url = decodeURIComponent(url)
  } catch {
    res.writeHead(400)
    return res.end("Bad Request")
  }
  if (url === "/") url = "/index.html"
  if (url.includes("..")) {
    res.writeHead(403)
    return res.end("Forbidden")
  }
  let file = join(root, url)
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, "index.html")
  } else if (!existsSync(file) && !extname(file)) {
    const htmlFile = `${file}.html`
    const indexFile = join(file, "index.html")
    if (existsSync(htmlFile)) file = htmlFile
    else if (existsSync(indexFile)) file = indexFile
  }
  if (!existsSync(file)) {
    res.writeHead(404)
    return res.end("404")
  }
  try {
    const data = await readFile(file)
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "text/plain" })
    res.end(data)
  } catch {
    res.writeHead(500)
    res.end("Error")
  }
}).listen(PORT, HOST, () => console.log(`hxue garden → http://${HOST}:${PORT}`))
