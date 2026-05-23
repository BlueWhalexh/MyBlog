---
name: /deploy
description: 全量发布到线上：Obsidian 同步 → 构建 → Git 推送 → 服务器部署
allowed-tools: Bash
user-invocable: true
---

# /deploy

Run the full production deploy pipeline:

1. **Sync Obsidian** — incremental sync from vault to `content/imported`
2. **Check & Build** — `tsc --noEmit` + `npx quartz build`
3. **Verify** — check HTML output, sitemap, RSS feed
4. **Git Push** — `git add . && git commit && git push origin main`
5. **Server Deploy** — SSH to 146.190.97.62, `git pull` + `node quartz/bootstrap-cli.mjs build` + verify

## Execution

Execute `powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -Force` from the project root.
If the SSH step fails (server unreachable or timeout), report the error clearly and suggest checking server status with `ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 -o ConnectTimeout=5 xuehang@146.190.97.62 "echo OK"`.
