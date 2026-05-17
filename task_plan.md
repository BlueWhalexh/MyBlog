# Task Plan: 个人技术博客 / Obsidian 笔记站

## Goal

在当前仓库本地初始化一个 Quartz 4 技术博客/Obsidian 笔记站，并建立文档驱动的开发、发布、部署说明。当前阶段只跑本地计划，不执行线上部署。

## Phases

| Phase | Status | Notes |
| --- | --- | --- |
| 1. 建立规划与调研记录 | complete | 创建 task_plan.md、findings.md、progress.md |
| 2. 初始化 Quartz 项目 | partial | GitHub 下载 Quartz 多次超时，先建立 Quartz 兼容本地原型 |
| 3. 配置博客内容与中文站点 | complete | 配置站点名、首页、示例内容、发布说明 |
| 4. 建立项目文档 | complete | AGENTS.md、SSD、Hermes、Context、Runbook |
| 5. 本地验证 | complete | npm build 成功；HTTP 前台服务可 200；后台常驻受当前环境限制 |

## Constraints

- 第一版采用 Quartz 4 + Obsidian Markdown + Git 推送。
- 私密笔记不进入 content 发布目录。
- 本轮不修改服务器，不停止 mypersonweb，不触碰 /opt/PaiFlow。
- 若需要联网安装依赖，按权限流程申请。

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `npm create quartz@latest` 返回 404 | 1 | Quartz 没有对应 create 包，改走 GitHub 模板 |
| `git clone` / zip 下载 Quartz 超时或 reset | 2 | 记录为网络问题，先实现 Quartz 兼容原型，后续替换 Renderer |
| PowerShell 直接 `npm` 被执行策略拦截 | 1 | 改用 `npm.cmd` |
| 内置浏览器打开 localhost 返回 `ERR_BLOCKED_BY_CLIENT` | 1 | 使用 curl/静态产物检查验证 |
| 当前环境下后台 server 无法稳定常驻 | 2 | 前台 `node scripts/serve.mjs` 可启动；最终给出手动预览命令 |

## Current Follow-up Status

| Item | Status | Notes |
| --- | --- | --- |
| 配置化增量同步 | complete | `sync-config.json` + `scripts/sync-and-build.ps1` + `sync-and-build.cmd` |
| Markdown 渲染修复 | complete | 支持 1-6 级标题、有序列表、任务列表、代码复制 |
| 导入目录树 | complete | Finder 按 `content/imported` 原目录树展示，大目录裁剪以保护性能 |
| 阅读体验增强 | complete | 阅读进度、回顶、到底、代码复制 |
