# AGENTS.md

## 项目定位

这是 hxue (薛煌) 的个人技术博客 / Obsidian 笔记公开站。第一版目标是稳定记录技术学习、项目复盘、面试准备和可公开笔记，不做完整论坛。

## 接手先读

1. `docs/AGENT_HANDOFF.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/SSD.md`
4. `docs/HERMES_ARCHITECTURE.md`
5. `docs/RUNBOOK.md`
6. `docs/UI_DECORATION_RESEARCH.md`
7. `docs/COLLABORATION.md`
8. `docs/OBSIDIAN_SYNC.md`
9. `task_plan.md`、`findings.md`、`progress.md`

## 本地命令

```powershell
npm.cmd run build
npm.cmd run serve
```

默认本地预览地址：`http://127.0.0.1:3010`。

Obsidian 公开目录同步：

```powershell
.\scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
npm.cmd run sync
```

## 关键约束

- 内容源目录是 `content/`，只放可公开内容。
- 新增技术博客和公开笔记必须先写入 Obsidian 笔记库 `D:\Document\Notes` 的公开源目录（当前 `知识库`），再通过同步脚本进入项目；不要直接在项目 `content/` 起草长期内容，除非用户明确要求临时 hotfix。
- 私密笔记、公司资料、账号、密钥、token 不得进入仓库。
- 目标 Renderer 是 Quartz 4；当前本地原型保持 Quartz 迁移兼容的 Markdown/frontmatter/双链结构。
- 多会话并行时先读 `docs/COLLABORATION.md`，不要同时整文件覆盖 `scripts/build.mjs`、`public/styles.css`、`public/app.js`。
- 服务器 `146.190.97.62` 上 3001 被 `mypersonweb` 占用，80 端口归属未确认前不得覆盖。
- `/opt/PaiFlow` 数据卷保留，不清理、不覆盖。

## 发布原则

用户主动 `git push` 才发布，流程是 Obsidian 落库 → dry-run 检查 → 同步到项目 → 本地构建验证 → Git commit/push → 服务器 git pull/build/verify，避免 Obsidian 私人 vault 自动同步导致误发布。
