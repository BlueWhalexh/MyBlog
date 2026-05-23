# Agent Handoff

这份文档给新接手的 AI Agent 使用，目标是让换 Agent 后能快速理解项目、继续开发、验证并上线，不依赖聊天上下文。

## 一句话定位

这是 hxue 的个人技术博客 / Obsidian 公开笔记站，基于 Quartz 4 构建静态站点，线上域名是 `hjhxh.site`。项目既是博客，也是从 Obsidian 笔记库筛选出来的公开知识库。

## 接手顺序

新 Agent 先按这个顺序读：

1. `AGENTS.md`：项目级协作约束和 Hard Rules。
2. `docs/canonical/AGENT_HANDOFF.md`：本文件，快速接手入口。
3. `docs/canonical/PROJECT_CONTEXT.md`：项目定位、架构和风险。
4. `docs/canonical/RUNBOOK.md`：构建、同步、部署、回滚。
5. `docs/canonical/OBSIDIAN_SYNC.md`：Obsidian-first 写作和同步规则。
6. `docs/canonical/HERMES_ARCHITECTURE.md`：Horizon / Editor / Renderer / Middleware / Estate / Safeguards 分层。
7. `docs/specs/SSD.md`：第一版需求边界和非目标。
8. `docs/specs/EXIT_GATES.md`：任务退出门槛定义。
9. `docs/canonical/COLLABORATION.md`：多会话协作边界。
10. `progress.md`：最近改动和踩坑记录。

## 本地事实

- 项目目录：`D:\OneDrive\文档\技术博客`
- Obsidian vault：`D:\Document\Notes`
- 当前公开源目录：`D:\Document\Notes\知识库`
- 同步目标：`content/imported`
- 本地预览默认地址：`http://127.0.0.1:3010`
- 构建产物：`public/`
- GitHub remote：`git@github.com:BlueWhalexh/MyBlog.git` 或 `https://github.com/BlueWhalexh/MyBlog.git`

## 常用命令

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run verify
```

本地预览：

```powershell
npm.cmd run serve
```

Obsidian 同步前 dry-run：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
```

正式同步：

```powershell
npm.cmd run sync
```

## 内容写作规则

新增博客、课程讲义、项目复盘、面试路线、AI Coding 实战等长期内容，不要直接写在项目 `content/` 里。

正确流程：

1. 先写入 Obsidian vault：`D:\Document\Notes`。
2. 放入公开源目录：当前是 `知识库`，例如 `知识库\技术博客`、`知识库\课程\COMP5611M`。
3. 确认不含私密笔记、公司资料、账号、密钥、token。
4. 运行 dry-run 看同步范围。
5. 运行 `npm.cmd run sync` 同步到 `content/imported`。
6. 运行 `npm.cmd run check`、`npm.cmd run build`、`npm.cmd run verify`。
7. Git commit / push。
8. 服务器从 GitHub 拉取并构建。

只有用户明确要求临时 hotfix 时，才直接修改项目 `content/`。

## GitHub 发布流程

日常不走手工散传文件。发布以 GitHub 为源：

```powershell
git status --short
git diff --stat
git add <files>
git commit -m "描述本次变更"
git push origin HEAD:main
```

如果 HTTPS 推送连不上，可用 SSH：

```powershell
git push git@github.com:BlueWhalexh/MyBlog.git HEAD:main
```

提交前必须确认没有把私人 vault、密钥、账号、token、公司资料加入仓库。

## 线上部署流程

线上服务器：

```text
IP: 146.190.97.62
User: xuehang
SSH key: C:\Users\xuehang\.ssh\do_digitalocean_ed25519
Project dir: /opt/tech-blog
Service port: 3010
Domain: hjhxh.site, www.hjhxh.site
```

服务器更新：

```powershell
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "cd /opt/tech-blog && git pull origin main && node quartz/bootstrap-cli.mjs build && node scripts/verify.mjs"
```

服务器上不要直接用 `npx quartz build`，曾出现 `quartz: Permission denied`。使用：

```bash
node quartz/bootstrap-cli.mjs build
```

静态服务通常不需要重启，因为它从 `public/` 读文件。若修改了 `scripts/serve.mjs`，再重启：

```bash
pgrep -af 'node scripts/serve.mjs'
kill <screen-pid> <node-pid>
cd /opt/tech-blog && screen -dmS blog node scripts/serve.mjs 3010 0.0.0.0
```

线上验证：

```powershell
curl.exe -I http://hjhxh.site
curl.exe -I http://hjhxh.site/sitemap.xml
curl.exe -I http://hjhxh.site/static/contentIndex.json
```

中文路径验证要用 URL 编码，或者用 `curl --resolve` 指定解析。

## 服务器边界

- 不覆盖 `work.hjhxh.site` 和 `paiflow.hjhxh.site`。
- `/opt/PaiFlow` 只读确认，不清理、不覆盖。
- `mypersonweb` 占用 3001，不要抢占。
- 80 端口由 nginx 代理，修改前先确认当前配置。
- nginx 独立配置是 `/etc/nginx/sites-available/tech-blog`。

## 低成本 UI/UX 改动记录

当前 UI 方向是克制的 macOS / Finder 风格：

- 左侧是搜索、阅读模式、Explorer。
- 中间内容区是 macOS 窗口式阅读卡。
- 文章页顶部已从突兀三个圆点改为标题栏。
- 代码块复制按钮使用 Quartz 的 `afterDOMLoaded` / `addCleanup` 机制绑定，且支持 HTTP fallback。
- 已增加阅读进度条、回到顶部按钮、标题锚点、外链提示。

如果继续改 UI，优先改：

1. `quartz/styles/custom.scss`
2. `quartz/components/styles/*.scss`
3. `quartz/components/scripts/uxtweaks.inline.ts`
4. `quartz/components/scripts/clipboard.inline.ts`

不要为了小视觉改动重写 Quartz 布局核心。

## 常见坑

- PowerShell 默认读取中文可能乱码，读中文文档用 `Get-Content -Encoding UTF8`。
- PowerShell `Set-Content -Encoding UTF8` 可能写入 BOM，Obsidian 同步后会产生无意义 diff。必要时使用无 BOM UTF-8 写回。
- `git status` 可能提示无法访问 `C:\Users\xuehang/.config/git/ignore`，这是本机权限警告，通常不影响仓库操作。
- 生产 pretty URL 必须由 `scripts/serve.mjs` 映射到 `.html` 或 `index.html`，不要删除 `decodeURIComponent`。
- 网页上的“同步按钮”不能在公网静态站点直接操作本地 vault；同步必须在本地开发环境执行。

## 最小验收标准

每次较大变更完成前至少跑：

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run verify
```

发布后至少验证：

```bash
cd /opt/tech-blog
git rev-parse --short HEAD
node scripts/verify.mjs
```

并抽查 `hjhxh.site` 首页、一个英文路径页面、一个中文路径页面、`sitemap.xml` 和 `static/contentIndex.json`。
