import { createServer } from "node:http"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { extname, join, normalize } from "node:path"

const root = join(process.cwd(), "dist")
const port = Number(process.env.PORT || 3010)

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
}

function safePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname)
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "")
  return join(root, normalized)
}

const server = createServer(async (req, res) => {
  try {
    let file = safePath(req.url || "/")
    const info = await stat(file).catch(() => null)
    if (info?.isDirectory()) file = join(file, "index.html")
    const fallback = await stat(file).catch(() => null)
    if (!fallback?.isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      res.end("Not found")
      return
    }

    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" })
    createReadStream(file).pipe(res)
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
    res.end(String(error))
  }
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Preview server: http://127.0.0.1:${port}`)
})
