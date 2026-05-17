# Findings

## Confirmed Intent

- 第一版是个人技术博客 + Obsidian 笔记公开站。
- 发布方式采用 Git 推送；用户主动发布，避免误同步私密笔记。
- 内容公开为主，私密内容不进入发布目录。
- 暂不实现完整论坛，后续可接评论或轻社区。

## Server Facts From Planning

- 服务器：146.190.97.62，用户 xuehang。
- SSH key：C:\Users\xuehang\.ssh\do_digitalocean_ed25519。
- PaiFlow 已停服但数据卷保留，目录在 /opt/PaiFlow。
- 当前仍有 mypersonweb 容器占用 3001。
- 80 端口正在监听，但归属尚未确认。
- 本地阶段不执行线上部署。

## Technology Notes

- Quartz 4 适合 Obsidian Markdown、双链、反链、图谱、全文搜索、个人数字花园。
- Astro/Starlight 与 Docusaurus 适合更产品化的技术文档站，作为后续备选。
- Ghost/Flarum/Discourse 暂不作为第一版，因为引入数据库、账号和更高维护成本。

## Local Implementation Findings

- 当前网络环境下，`git clone https://github.com/jackyzha0/quartz.git` 和 GitHub zip 下载多次超时或连接重置。
- `npm create quartz@latest` 返回 404，不能作为 Quartz 初始化方式。
- 为了先跑通本地计划，已建立无依赖的 Quartz 兼容原型：`content/`、frontmatter、Obsidian wikilink、标签、反链、图谱、搜索索引、静态构建。
- `npm.cmd run build` 成功生成 4 个内容页面和标签/图谱页面。
- 前台运行 `node scripts/serve.mjs` 可以启动 `http://127.0.0.1:3010` 并返回 HTTP 200；当前 Codex 环境中后台常驻进程和内置浏览器访问 localhost 受限。

## UI Research Notes

- Quartz 官方组件体系重点围绕 Explorer、Backlinks、Graph View、Search、Wikilinks，说明个人知识站的体验核心不是营销首页，而是可探索的信息网络。
- Obsidian Digital Garden 生态强调从 vault 中选择性发布、保留反链/图谱、允许自定义样式；这与本项目“公开目录 + Git 发布”的边界一致。
- 数字花园设计案例普遍把内容状态、上下文链接和邻近主题放在文章周边，适合长期学习笔记而不是一次性博客流。
- 本轮 UI 采用“左侧 Explorer + 中间阅读 + 右侧搜索/反链/图谱”的三栏结构；移动端自动降为单栏。
- 视觉方向选择温和纸张底色、细网格、低饱和青绿和棕色强调，避免单一蓝紫渐变或营销卡片感。
