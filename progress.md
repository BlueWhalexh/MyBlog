# Progress Log

## 2026-05-17 (Session 2 — 清理与修复)

- 移除旧原型构建系统：删除 `scripts/build.mjs`、`scripts/serve.mjs`、`dist/`，Quartz 4 为唯一构建工具。
- 更新 `.gitignore`：添加 `.claude/worktrees/` 防止 worktree 目录误提交。
- 修复 SCSS：custom.scss 中覆写侧栏 `position: sticky` → `position: relative`，与性能优化文档一致。
- 统一 Quartz 色彩：调整 light/dark 模式色板，降低对比度、更柔和。
- `npm run build` 通过 (257 文件 → 599 产物)，`npm run verify` 通过 (330 HTML，257 sitemap URL)。

## 2026-05-17 (Session 1)

- 启动本地执行阶段。
- 确认当前目录只有 `.git`，暂无项目文件。
- 创建规划文件，准备初始化 Quartz 项目与文档。
- Quartz 官方仓库通过 git clone 和 zip 下载均遇到网络超时或连接重置。
- 建立了 Quartz 兼容本地原型，包含 `content/`、`public/`、`scripts/`、`docs/` 和项目级 `AGENTS.md`。
- `npm.cmd run build` 成功，生成 `dist/` 静态站点。
- 前台运行 `node scripts/serve.mjs` 可启动预览服务并返回 HTTP 200。
- 内置浏览器访问 localhost 被拦截，改用构建产物和 curl 做验证。
- 临时启动预览服务验证 `/`、`/tags/`、`/graph/`、`/search-index.json` 均返回 200。
- 搜索索引包含 4 个页面，确认包含 Obsidian 发布流程、Hermes 架构说明、个人技术博客脚手架调研。
- 参考企业技术博客后补齐文章聚合页、RSS、sitemap、robots、canonical/OG、阅读时间、目录和相关文章。
- 新增 `scripts/verify.mjs` 与 `npm.cmd run verify`，验证 17 个 HTML 文件和 4 条搜索索引记录通过。
- 新增 `docs/FUNCTIONAL_VERIFICATION_AND_UPGRADE_IDEAS.md`，记录功能验证结果和后续升级优先级。
- 调研 Quartz、Obsidian Digital Garden 和数字花园常见 UI 模式后，重做为三栏知识库界面。
- 新增首页统计、Explorer、右侧搜索、反链空状态、SVG 知识图谱、Ctrl+K 搜索聚焦和阅读模式。
- 构建后静态检查确认首页包含 Explorer、技术花园 Hero、全站搜索、局部图谱；图谱页包含 SVG 关系图。
- 追加调研常见技术博客装修方向，形成 `docs/UI_DECORATION_RESEARCH.md`。
- 修复图谱节点 hover 抖动：移除 SVG circle 的 `transform: scale()`，改用 `r/stroke-width/fill` 过渡。
- 发现多会话并行导致 `scripts/build.mjs` 和 `public/styles.css` 结构错位，已合并 RSS/sitemap/文章列表与 Digital Garden 三栏 UI。
- 按 Mac 风格 Digital Garden 方向重做 UI：玻璃顶栏、Finder 侧栏、macOS 窗口、Paper/Dusk 主题切换。
- 新增 `docs/COLLABORATION.md`，记录多会话避免覆盖的协作约定。
- 用户反馈页面变卡后，移除 `backdrop-filter`、径向渐变、sticky 侧栏和重阴影，保留 Mac 风格但降低重绘成本。
- 构建、JS 语法检查和临时 HTTP 验证继续通过。
- 复制头像到 `public/avatar.png`，并在顶栏和首页个人卡片中使用。
- 新增 `scripts/sync-obsidian.ps1` 和 `docs/OBSIDIAN_SYNC.md`，支持从 Obsidian 公开目录同步 Markdown，可选同步图片。
- 构建脚本恢复为 UTF-8 正常中文，并将搜索索引单篇正文截断到 3000 字以降低大量笔记时的前端负担。
- 修复同步脚本兼容性：避免依赖当前 Windows PowerShell 不支持的 `[System.IO.Path]::GetRelativePath`。
- 验证 dry-run、构建、头像静态资源和搜索索引 HTTP 访问均通过。
- 从 `D:\Document\Notes\知识库` 同步 252 篇技术笔记到 `content/imported`，未同步整个 vault，避免 daily、实习、todo、模板等内容误发布。
- 修复 PowerShell UTF-8 读取问题，避免中文 Markdown 同步后乱码。
- 为大量笔记增加性能保护：侧栏每组最多 36 条，局部图谱 32 节点，全局图谱 96 节点。
- 新增 `sync-config.json`、`scripts/sync-and-build.ps1` 和 `sync-and-build.cmd`，同步规则配置化，支持增量同步与一键同步构建。
- 修复 Markdown 渲染：支持 `####` 到 `######` 标题、有序列表、任务列表，并给代码块加复制按钮。
- 左侧 Finder 改为按 `content/imported` 原始目录树动态展示，保留目录结构并对超大目录做裁剪，避免每页 DOM 过大。
- 新增阅读体验增强：代码复制、阅读进度条、回到顶部、跳到底部。
- 验证 `npm.cmd run build` 与 `npm.cmd run verify` 通过；`原子类与 Unsafe 类` 中 `#### 3.5 Unsafe 在 JDK 中的应用` 已渲染为 `<h4>`。
