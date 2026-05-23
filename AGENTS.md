# AGENTS.md

## 项目定位

这是 hxue (薛煌) 的个人技术博客 / Obsidian 笔记公开站。第一版目标是稳定记录技术学习、项目复盘、面试准备和可公开笔记，不做完整论坛。

## 接手先读

1. `docs/canonical/AGENT_HANDOFF.md`
2. `docs/canonical/PROJECT_CONTEXT.md`
3. `docs/specs/SSD.md`
4. `docs/canonical/HERMES_ARCHITECTURE.md`
5. `docs/canonical/RUNBOOK.md`
6. `docs/reference/UI_DECORATION_RESEARCH.md`
7. `docs/canonical/COLLABORATION.md`
8. `docs/canonical/OBSIDIAN_SYNC.md`
9. `docs/specs/EXIT_GATES.md`
10. `task_plan.md`、`progress.md`

## 本地命令

```powershell
# Windows
npm.cmd run build
npm.cmd run serve
npm.cmd run verify
npm.cmd run sync
```

```bash
# macOS
npm run build
npm run serve
npm run verify
npm run sync
```

默认本地预览地址：`http://127.0.0.1:3010`。

Obsidian 公开目录同步（Windows）：

```powershell
.\scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
npm.cmd run sync
```

## Hard Rules（从历史错误中提炼）

### 构建与验证

- 每次变更完成后必须跑 `check + build + verify` 三步全过才能 commit。
- 服务器上用 `node quartz/bootstrap-cli.mjs build`，不要用 `npx quartz build`（权限问题，Session 4 踩坑）。
- Windows PowerShell 环境下用 `npm.cmd`，不要裸 `npm`（执行策略拦截，Session 1 踩坑）。

### 内容安全

- 长期内容必须 Obsidian-first：先落库到 Obsidian vault，再同步到项目。不在项目 `content/` 起草长期内容，除非用户明确要求临时 hotfix。
- 同步前必须 dry-run，确认无私密文件进入。
- 中文文件用无 BOM UTF-8 写入。PowerShell `Set-Content -Encoding UTF8` 会插入 BOM，要用 `[System.IO.File]::WriteAllText()`（Session 1 踩坑）。

### SPA 与前端

- 自定义 JS 必须用 Quartz `afterDOMLoaded` + `addCleanup` 机制。裸 DOM 操作在 SPA micromorph 导航后会创建重复元素（Session 3 踩坑）。
- 不要覆盖 Quartz base.scss 的侧栏 `position: sticky`，否则 SPA 首次导航布局异常（Session 2 修复）。
- `backdrop-filter` 和多层 `radial-gradient` 在 Windows 浏览器严重掉帧，不要使用（Session 1 反馈）。

### 部署边界

- 服务器 3001 属于 `mypersonweb`，不要占用。
- `/opt/PaiFlow` 只读，不清理、不覆盖。
- 80 端口由 nginx 管理，修改前先 `ss -tulpn` 确认。
- 静态服务从 `public/` 读取，内容更新通常不需要重启进程。

### 协作

- 多会话并行时先读 `docs/canonical/COLLABORATION.md`。
- 不要同时整文件覆盖 `quartz/styles/custom.scss`、`quartz.layout.ts`、`quartz.config.ts`。
- 大改完成后立即 commit，形成恢复点。

## 关键约束

- 内容源目录是 `content/`，只放可公开内容。
- 私密笔记、公司资料、账号、密钥、token 不得进入仓库。
- 目标 Renderer 是 Quartz 4。
- 服务器 `146.190.97.62` 上 3001 被 `mypersonweb` 占用，80 端口归属未确认前不得覆盖。
- `/opt/PaiFlow` 数据卷保留，不清理、不覆盖。

## 发布原则

用户主动 `git push` 才发布，流程是 Obsidian 落库 → dry-run 检查 → 同步到项目 → 本地构建验证 → Git commit/push → 服务器 git pull/build/verify，避免 Obsidian 私人 vault 自动同步导致误发布。

## Exit Gate Requirement

每个任务完成前，必须满足对应任务类型的退出门槛。退出门槛定义见 `docs/specs/EXIT_GATES.md`。如果没有匹配的任务类型，至少跑 check + build + verify。

## Consistency Check（每次较大变更后）

1. `grep -r "docs/" AGENTS.md docs/` — 确认所有文件路径引用指向存在的文件。
2. 验证"接手先读"列表中每个路径都对应实际文件。
3. 如果移动或重命名了文件，搜索全项目确认无断链。
4. `progress.md` 最新一条记录了本次变更的关键决策和踩坑（如有）。
5. 如果发现新的 Hard Rule（某个错误消耗了 >10 分钟定位），添加到上面的 Hard Rules 部分。
