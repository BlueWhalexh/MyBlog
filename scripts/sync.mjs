import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { basename, dirname, extname, join, relative, resolve } from "node:path"
import { parseArgs } from "node:util"

// ── Color helpers ──────────────────────────────────────────
const C = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", gray: "\x1b[90m", bold: "\x1b[1m" }

function tag(color, label) {
  return `${C[color]}${C.bold}[${label}]${C.reset}`
}

// ── Config ─────────────────────────────────────────────────
const args = parseArgs({
  options: {
    config: { type: "string", default: "sync-config.json" },
    "dry-run": { type: "boolean", default: false },
    incremental: { type: "boolean", default: true },
    delete: { type: "boolean", default: false },
    images: { type: "boolean", default: false },
  },
}).values

const root = process.cwd()

async function loadConfig(configPath) {
  const raw = await readFile(join(root, configPath), "utf8")
  return JSON.parse(raw)
}

const DEFAULT_EXCLUDE = [
  ".obsidian", ".trash", "private", "Private", "draft", "Draft",
  "secret", "Secret", "daily", "Daily", "todo", "Todo",
  "template", "Template", "claude", "Claude", "intern", "Intern",
]

// ── Utils ───────────────────────────────────────────────────
function sha256First(buf) {
  return createHash("sha256").update(buf).digest("hex")
}

function isExcluded(relPath, excludeParts) {
  const parts = relPath.split(/[\\/]/)
  const hidden = parts.some((p) => p.startsWith("."))
  if (hidden) return true
  const name = basename(relPath, extname(relPath))
  return parts.some((p) => excludeParts.includes(p)) || excludeParts.includes(name)
}

async function collectMarkdown(dir, excludeParts, extensions) {
  const files = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    const rel = relative(dir, full)
    if (entry.isDirectory()) {
      if (!isExcluded(rel + "/", excludeParts)) {
        files.push(...await collectMarkdown(full, excludeParts, extensions))
      }
    } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
      if (!isExcluded(rel, excludeParts)) {
        files.push(full)
      }
    }
  }
  return files
}

// ── Sync Engine ─────────────────────────────────────────────
async function sync() {
  const config = await loadConfig(args.config)
  const vaultPath = config.vaultPath
  const sourceSubdir = config.sourceSubdir || ""
  const destRel = config.destination || "content/imported"
  const includeImages = args.images || config.includeImages || false
  const deleteMissing = args.delete || config.deleteMissing || false
  const incremental = args.incremental
  const excludeParts = config.excludePathParts || DEFAULT_EXCLUDE
  const extensions = config.includeExtensions || [".md"]

  if (!vaultPath) {
    console.error("vaultPath is required in sync-config.json")
    process.exit(1)
  }

  const sourceRoot = sourceSubdir ? join(vaultPath, sourceSubdir) : vaultPath
  const destRoot = resolve(root, destRel)
  const assetRoot = resolve(root, "public/obsidian-assets")

  console.log(`${C.bold}Obsidian Sync${C.reset}`)
  console.log(`  Source:    ${sourceRoot}`)
  console.log(`  Dest:      ${destRoot}`)
  console.log(`  Mode:      ${args["dry-run"] ? "dry-run" : incremental ? "incremental" : "full copy"}`)
  console.log()

  const sourceFiles = await collectMarkdown(sourceRoot, excludeParts, extensions)
  console.log(`  Found ${sourceFiles.length} Markdown files in source`)

  if (!args["dry-run"]) {
    await mkdir(destRoot, { recursive: true })
    if (includeImages) await mkdir(assetRoot, { recursive: true })
  }

  const imagePattern = /!\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|svg))\]\]/gi
  const seenTargets = new Set()
  const syncedImages = new Set()
  let copied = 0
  let skipped = 0
  let modified = 0

  for (const src of sourceFiles) {
    const relPath = relative(sourceRoot, src)
    const target = join(destRoot, relPath)
    const targetDir = dirname(target)
    seenTargets.add(resolve(target).toLowerCase())

    const srcStat = await stat(src)
    let action = "new"

    if (incremental) {
      try {
        const targetStat = await stat(target)
        if (srcStat.size === targetStat.size && srcStat.mtimeMs <= targetStat.mtimeMs) {
          action = "skip"
        } else {
          action = "mod"
        }
      } catch {
        action = "new"
      }
    }

    if (action === "skip") {
      skipped++
      if (args["dry-run"]) console.log(`  ${tag("gray", "·")} ${relPath}`)
      continue
    }

    let content = await readFile(src, "utf8")

    if (includeImages) {
      content = content.replace(imagePattern, (_, imageName) => {
        // In Node.js we don't crawl the vault for images
        // Just preserve the reference
        return `![[${basename(imageName)}]]`
      })
    }

    if (args["dry-run"]) {
      const label = action === "mod" ? "~" : "+"
      const color = action === "mod" ? "yellow" : "green"
      console.log(`  ${tag(color, label)} ${relPath}`)
    } else {
      await mkdir(targetDir, { recursive: true })
      await writeFile(target, content, "utf8")
    }

    if (action === "mod") modified++
    else copied++
  }

  // Delete missing
  let deleted = 0
  if (deleteMissing) {
    const existing = await collectMarkdown(destRoot, [], [".md"])
    for (const targetFile of existing) {
      const fullTarget = resolve(targetFile).toLowerCase()
      if (!seenTargets.has(fullTarget)) {
        const relTarget = relative(destRoot, targetFile)
        if (args["dry-run"]) {
          console.log(`  ${tag("red", "!")} ${relTarget}`)
        } else {
          await rm(targetFile, { force: true })
        }
        deleted++
      }
    }
  }

  // ── Summary ──
  console.log()
  if (copied > 0) console.log(`  ${tag("green", "+")} ${copied} new`)
  if (modified > 0) console.log(`  ${tag("yellow", "~")} ${modified} modified`)
  if (deleted > 0) console.log(`  ${tag("red", "!")} ${deleted} deleted`)
  if (skipped > 0) console.log(`  ${tag("gray", "·")} ${skipped} skipped (unchanged)`)

  if (args["dry-run"]) {
    console.log(`\n${C.bold}Dry-run complete.${C.reset} Run without --dry-run to sync.`)
  } else {
    console.log(`\n${C.bold}Sync complete.${C.reset} Run: npm run build`)
  }
}

sync().catch((err) => {
  console.error(`${C.red}${err.message}${C.reset}`)
  process.exit(1)
})
