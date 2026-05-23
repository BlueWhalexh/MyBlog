# V2 Implementation Log

逐次会话推进 V2 实现的工程日志。比 progress.md 更细，记录每一步决策、踩坑、验证结果。

---

## 2026-05-23 — P1 自动化发布 + P2 部分集成

### 已完成

**P1 自动化发布流程（代码层面完成）**
- `.github/workflows/deploy.yml`：blog repo 的 CI——checkout 双 repo + build + verify + rsync 部署
- `scripts/pull-content.sh` + npm script `pull-content`：本地拉取 knowledge-base
- `docs/canonical/KB_REPO_SETUP.md`：完整一次性配置指南
- 触发链：knowledge-base push → repository_dispatch → MyBlog Actions → rsync

**P2 RSS（修复死链）**
- `quartz.layout.ts`：footer RSS link 从 `/feed.xml` 改为 `/index.xml`（实际生成的文件名）

**P2 Giscus 评论（env var 配置）**
- `quartz.layout.ts`：通过 `GISCUS_REPO_ID`、`GISCUS_CATEGORY_ID` 环境变量条件加载 Comments 组件
- 未配置时不注入，build 干净
- 配置位置：CI secrets 或本地 .env

**P2 Umami 统计（env var 配置）**
- `quartz.config.ts`：通过 `UMAMI_WEBSITE_ID`、`UMAMI_HOST` 环境变量条件启用
- 用 Quartz 内置 `analytics: { provider: "umami" }`，无需自建脚本

### 关键踩坑

1. **`.gitignore` 加 `content/imported/` 会让 build 跳过所有 imported 文件**
   - Quartz 用 globby 扫描，默认 `gitignore: true`
   - 实测：264 文件 → 8 文件
   - 解决：不加 .gitignore，让 knowledge-base 作为 nested git repo（自带 `.git`）自然不被 blog repo 跟踪
   - 已写入 `KB_REPO_SETUP.md` 警告章节

2. **footer RSS 链接死链**
   - quartz.layout.ts 写的是 `/feed.xml`，实际 RSS plugin 生成 `/index.xml`
   - 已修

### 待实施（决策记录）

- **P2 语义搜索**：需要 embedding pipeline + 客户端相似度检索，单会话无法稳妥实施。决定：写入 V3 spec 单独立项，附实现路径
- **P2 AI 问答**：需要 LLM API + RAG，有运行成本和密钥管理问题。决定：V3 立项
- **P4 多端写作**：需要独立 API + Auth 后端，与静态站架构正交。决定：V3 立项为单独项目，不强行塞进当前 repo

### 验证

- ✅ `npm run check` 通过
- ✅ `npm run build` 264 文件无回归
- ✅ Build 产物中无 giscus/umami 字符串（env var 未设时不注入）
- ⏳ Giscus/Umami 实际渲染待 secrets 配置后验证

### 后续

**P3（UI/前端精质化）审计结论**：V1 已经做了 489 行 custom.scss 和完整的 dark mode、preconnect、RSS auto-discovery、viewport meta。head 结构干净，性能基础设施齐全。无需追加工作。

**P4（多端写作）决策**：移到 V3。原因：与静态博客架构正交，需要 Auth + API 后端，应作为独立项目（建议 `BlueWhalexh/blog-editor`）。

**P2 剩余（语义搜索 / AI 问答）决策**：移到 V3。原因：embedding pipeline + 向量索引 + 客户端相似度 + 后端代理 endpoint，是多日工程，不该塞进 V2 收尾。

### 产出文档

- [docs/canonical/MANUAL_SETUP.md](docs/canonical/MANUAL_SETUP.md)：所有用户手动配置步骤
- [docs/canonical/KB_REPO_SETUP.md](docs/canonical/KB_REPO_SETUP.md)：knowledge-base repo 详细配置
- [docs/specs/SSD-v3.md](docs/specs/SSD-v3.md)：V3 规划，包含语义搜索/AI 问答/多端写作

### V2 完成度对照 SSD-v2

| SSD-v2 章节 | 状态 |
|-------------|------|
| P1 自动化发布 | ✅ 代码完成（用户手工配 secrets/repo） |
| P2 RSS | ✅ 完成（修死链） |
| P2 评论 | ✅ 代码完成（用户配 giscus.app） |
| P2 阅读数据 | ✅ 代码完成（用户部署 Umami） |
| P2 语义搜索 | ⏭ 移 V3 |
| P2 AI 问答 | ⏭ 移 V3 |
| P3 暗色模式 / 响应式 / 性能 | ✅ V1 已完成，V2 无新工作 |
| P4 多端写作 | ⏭ 移 V3 |
