# Hermes 架构

Hermes 是本项目的架构分层命名，用来让内容、构建、部署和安全边界清楚分开。

| Layer | 责任 | 当前状态 |
| --- | --- | --- |
| Horizon | 访问者看到的博客、笔记、搜索、标签、图谱 | 本地原型已覆盖 |
| Editor | Obsidian 本地写作、人工筛选公开内容 | 约定 `content/` 为公开目录 |
| Renderer | Markdown 构建为静态站点 | Quartz 4，已从本地原型完成迁移 |
| Middleware | Nginx/Caddy 反向代理、域名、HTTPS | 部署前确认 80 端口归属 |
| Estate | 服务器目录、容器、数据卷、磁盘 | `/opt/PaiFlow` 只保留不触碰 |
| Safeguards | 备份、回滚、端口预检、最小变更 | 运行手册中定义 |

## 数据流

```text
Obsidian
  -> content/*.md
  -> Renderer build
  -> dist/
  -> Middleware
  -> Browser
```

## 部署边界

- 新站默认目录：`/opt/tech-blog`。
- 新站默认内部端口：`127.0.0.1:3010`。
- 未确认 80 端口归属前，不切换反向代理。
- 不停止 `mypersonweb`，除非用户明确要求替换旧站。

## 迁移到 Quartz 4 ✅ (已完成)

迁移已于 2026-05-17 完成。内容层无缝兼容：

- `content/` Markdown 内容目录。
- YAML frontmatter。
- Obsidian `[[wikilink]]` 与 `[[path|label]]`。
- 标签、搜索、图谱的用户体验入口。
