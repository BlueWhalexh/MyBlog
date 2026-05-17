# Runbook

## 本地构建

```powershell
npm.cmd run build
```

构建产物输出到 `public/`（Quartz 4 默认目录）。

## 本地功能验证

```powershell
npm.cmd run verify
```

当前验证项包括：核心 HTML 页面、搜索索引、RSS、sitemap、robots、canonical、RSS link 和阅读时间字段。

## 本地预览

```powershell
npm.cmd run serve
```

`scripts/serve.mjs` 是生产服务器当前使用的轻量静态服务脚本。它需要支持 Quartz pretty URL：

- `/posts/foo` → `public/posts/foo.html`
- `/imported/MOC/八股文索引` → `public/imported/MOC/八股文索引.html`
- `/imported/` → `public/imported/index.html`

注意保留 `decodeURIComponent`，否则 sitemap 中的中文 URL 会在线上 404。

## Obsidian 增量同步

日常同步优先使用：

```powershell
npm.cmd run sync
```

或双击项目根目录 `sync-and-build.cmd`。

同步源、目标目录和过滤规则在 `sync-config.json` 中维护。先检查不写入：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
```

默认地址：

```text
http://127.0.0.1:3010
```

也可以一条命令构建并预览：

```powershell
npm.cmd run preview
```

## 写作与发布

新增技术博客和公开笔记默认走 Obsidian-first 流程：先落库到 `D:\Document\Notes`，再同步到项目，最后通过 Git 发布。不要直接在项目 `content/` 里长期起草，除非用户明确要求临时 hotfix。

1. 在 Obsidian 私人 vault `D:\Document\Notes` 写作。
2. 按笔记库规则维护双链、标签和 frontmatter。
3. 只把可以公开的笔记放入公开源目录（当前 `知识库`）。
4. 发布前确认不含私密笔记、公司资料、账号、密钥、token。
5. 先 dry-run 检查同步范围。
6. 正式同步到本项目并本地验证。
7. Git 发布：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
npm.cmd run sync
npm.cmd run check
npm.cmd run build
npm.cmd run verify
git status --short
git diff --stat
git add .
git commit -m "更新博客笔记"
git push origin main
```

发布原则：不要手工把零散文件复制到服务器，也不要绕过 Obsidian 直接把长期内容写进项目。服务器只从 GitHub 拉取已验证提交，保证线上状态可追踪、可回滚。

## 写作模板

项目根目录 `templates/` 维护公开写作模板：

- `templates/post.md`：技术博客文章。
- `templates/note.md`：普通知识笔记。
- `templates/interview.md`：面试题回答。
- `templates/project-review.md`：项目复盘。

模板默认 `draft: true`，发布前需要确认内容可公开并改为 `draft: false`。

## 部署前预检

只读检查建议：

```bash
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "ss -tulpn"
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'"
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "df -h"
```

如果普通用户看不到 80 端口进程，使用 sudo 前先确认权限和影响。

## 部署草案 ✅ 已上线

- **访问地址**：`http://146.190.97.62:3010/`
- **域名反代**：`hjhxh.site`、`www.hjhxh.site` → `127.0.0.1:3010`
- **目标目录**：`/opt/tech-blog`
- **服务端口**：`0.0.0.0:3010`（UFW 已开放）
- **进程管理**：`screen -S blog node serve.mjs`（`serve.mjs` 是项目内的精简静态文件服务器）
- **反向代理**：nginx 独立配置 `/etc/nginx/sites-available/tech-blog`，不覆盖 `work.hjhxh.site` 和 `paiflow.hjhxh.site`。
- **DNS 待确认**：`hjhxh.site` 需要 A 记录指向 `146.190.97.62` 才能公网直连。
- **PaiFlow**：`/opt/PaiFlow` 只读确认，不清理。

### 首次部署记录 (2026-05-17)

```bash
# 服务器上：
cd /opt/tech-blog
git pull
rm -rf public && mkdir public
npx quartz build
screen -S blog node serve.mjs
```

### 日常更新

```bash
ssh xuehang@146.190.97.62 "cd /opt/tech-blog && git pull origin main"
ssh xuehang@146.190.97.62 "cd /opt/tech-blog && node quartz/bootstrap-cli.mjs build && node scripts/verify.mjs"
# 静态服务从 public/ 读取，纯内容和样式更新通常无需重启
```

服务器上如果直接运行 `npx quartz build` 出现 `quartz: Permission denied`，使用上面的 `node quartz/bootstrap-cli.mjs build`。这是本地 Quartz CLI 的执行权限问题，不影响构建内容。

如果修改了 `scripts/serve.mjs`，需要重启 screen 中的静态服务：

```bash
pgrep -af 'node scripts/serve.mjs'
kill <screen-pid> <node-pid>
cd /opt/tech-blog && screen -dmS blog node scripts/serve.mjs 3010 0.0.0.0
```

### 域名反代验证

DNS 未生效前可以本地强制解析验证：

```powershell
curl.exe -I --resolve hjhxh.site:80:146.190.97.62 http://hjhxh.site
curl.exe -I --resolve www.hjhxh.site:80:146.190.97.62 http://www.hjhxh.site
```

## 回滚

- 保留部署前反向代理配置。
- 新站异常时先移除新路由。
- 如果只是内容问题，回退 Git commit 后重新构建。
