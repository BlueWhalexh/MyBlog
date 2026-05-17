# Project Context

## 当前状态

当前仓库用于初始化个人技术博客 / Obsidian 笔记公开站。用户确认第一版采用：

- 博客 + 笔记，不做完整论坛。
- Git 推送发布。
- 内容公开为主。
- 服务器自动部署作为后续实现。

## 调研结论

首选 Quartz 4，因为它最贴近 Obsidian 笔记发布，支持 Markdown、双链、反链、图谱和静态部署。

Astro/Starlight、Docusaurus 可作为后续产品化文档站备选。Ghost、Flarum、Discourse 暂不作为第一版，因为维护成本和系统复杂度更高。

## 本地实现说明

Renderer 层已于 2026-05-17 从本地原型迁移到 Quartz 4。当前构建系统：

- `npx quartz build`：Markdown 构建为静态站点 → `public/`。
- `scripts/verify.mjs`：构建产物验证。
- `scripts/sync.mjs`：从 Obsidian vault 增量同步 Markdown 到 `content/imported`。
- `content/`：公开笔记目录。
- 旧原型脚本 (`scripts/build.mjs`、`scripts/serve.mjs`、`dist/`) 已移除。

## 已补齐的博客基础功能

- 文章聚合页 `/posts/`。
- RSS feed `/feed.xml`。
- sitemap `/sitemap.xml` 与 robots `/robots.txt`。
- canonical / Open Graph 基础 SEO。
- 阅读时间、目录、相关文章。
- 一条命令验证：`npm.cmd run verify`。

## 服务器事实

- IP：`146.190.97.62`
- 用户：`xuehang`
- SSH key：`C:\Users\xuehang\.ssh\do_digitalocean_ed25519`
- PaiFlow 已停服但数据卷保留，目录：`/opt/PaiFlow`
- `mypersonweb` 占用 3001。
- 80 端口正在监听，归属待确认。

## 风险

- 私密笔记误发布：通过显式 Git 发布和 `content/` 白名单控制。
- 80 端口误覆盖：部署前必须确认归属。
- 旧服务受影响：新站使用独立目录和内部端口。
- Quartz 模板下载失败：当前使用兼容原型先跑通，本地内容结构可迁移。
