# SSD v2: 技术博客第二版迭代

## 定位

在 V1（稳定发布 + Obsidian 同步 + 静态站点）基础上，向「自动化 + 智能化 + 多端」演进。

## 阶段划分

| 阶段 | 主题 | 依赖 |
|------|------|------|
| P1 | 自动化发布流程 | 无（基础设施） |
| P2 | 内容体验增强 | P1 稳定部署 |
| P3 | UI/前端精质化 | P1 自动部署方便迭代 |
| P4 | 多端写作支持 | P1 + P2（需要后端 API） |

---

## P1: 自动化发布流程

### 目标

Obsidian 写完 → 推送到知识库 repo → 博客自动构建部署，去掉手动 sync/build/push/SSH 步骤。

### 范围

- 独立知识库 Git 仓库（存放可公开 Markdown 内容）
- GitHub Actions：知识库 repo push 触发 → 拉取到博客 repo → Quartz build → 部署到服务器
- 部署方式：rsync 到服务器 / 或服务器 webhook 拉取
- 保留手动发布作为 fallback
- 内容安全门：自动检查无私密文件泄露（排除规则）

### 验收标准

- [ ] 知识库 repo push 后 5 分钟内线上更新
- [ ] 构建失败时有通知（GitHub Actions failure notification）
- [ ] 手动 fallback 仍可用
- [ ] 私密文件排除规则与 V1 sync-config 一致

### 非目标

- 不做实时同步（Obsidian 保存即发布）
- 不做 CDN/边缘部署（当前单服务器够用）

---

## P2: 内容体验增强

### 目标

让读者能更高效地发现和理解内容，提供超越传统博客的知识检索体验。

### 范围

- 语义搜索：Markdown 内容 → embedding → 向量数据库 → 搜索 API
- AI 问答（可选）：基于内容的 RAG 问答入口
- RSS 输出：标准 Atom/RSS feed
- 阅读数据：简易访问统计（自托管，不用第三方 analytics）
- 评论系统：轻量方案（Giscus / Utterances / 自建）

### 验收标准

- [ ] 语义搜索返回相关度高于关键词搜索的结果
- [ ] RSS feed 可被标准阅读器订阅
- [ ] 评论功能可用且无需用户注册独立账号
- [ ] 访问统计不引入第三方 tracker（隐私优先）

### 非目标

- 不做全文翻译
- 不做付费墙 / 会员体系

---

## P3: UI/前端精质化

### 目标

视觉和交互达到「个人作品集」级别，移动端体验流畅。

### 范围

- 暗色模式完善（当前有基础，需打磨过渡和配色一致性）
- 响应式布局优化（移动端侧栏、图谱、搜索体验）
- 微交互动画（页面过渡、hover 反馈，不用 backdrop-filter）
- 性能优化：Lighthouse 90+ 各项
- 字体和排版：中英文混排优化

### 验收标准

- [ ] 移动端 Lighthouse Performance ≥ 90
- [ ] 暗色/亮色切换无闪烁、无样式遗漏
- [ ] SPA 导航无 DOM 泄漏（连续导航 10 页后 DOM 节点数稳定）
- [ ] 首屏 LCP < 2s

### 非目标

- 不追求花哨动效（保持克制 macOS 风格）
- 不引入重量级前端框架（保持 Quartz Preact 体系）

---

## P4: 多端写作支持

### 目标

除 Obsidian 桌面端外，支持从 Web/移动端创建和编辑内容。

### 范围

- 轻量 Web 编辑器（Markdown 编辑 + 预览）
- API 层：内容 CRUD、草稿管理
- 认证：简单 token 或 OAuth（单用户，不需要注册系统）
- 移动端适配的编辑界面
- 与知识库 repo 双向同步（Web 编辑 → commit 到 repo）

### 验收标准

- [ ] 从 Web 端创建文章 → 自动同步到知识库 repo → 触发部署
- [ ] 编辑器支持 Markdown 实时预览
- [ ] 认证安全（token 不暴露、HTTPS）
- [ ] 不破坏 Obsidian 端同步流程

### 非目标

- 不做多用户协作
- 不做富文本编辑器（Markdown-only）
- 不做 Obsidian 插件（用 Obsidian 自身同步能力）

---

## 技术选型倾向（待确认）

| 组件 | 候选 |
|------|------|
| CI/CD | GitHub Actions |
| 部署触发 | webhook / rsync / 服务器 cron pull |
| 向量数据库 | Chroma（自托管免费）/ Pinecone（免费层） |
| Embedding | OpenAI text-embedding-3-small / 本地模型 |
| 评论 | Giscus（GitHub Discussions） |
| 统计 | Umami（自托管） |
| Web 编辑器 | 自建轻量 Markdown editor |
| API 层 | Node.js + Express / Hono（与现有 Node 栈一致） |

---

## 风险与约束

- 服务器资源有限（单台 DigitalOcean Droplet），P2 的向量数据库和 P4 的 API 层需评估内存占用
- 不能影响现有 PaiFlow (3001) 和 mypersonweb 服务
- 内容安全：任何自动化流程都不能绕过私密文件排除
- CJK 路径兼容性需持续关注

---

## 里程碑

- **M1 (P1)**：知识库 repo 建立 + GitHub Actions 自动部署 ← 下一步立即开始
- **M2 (P2)**：语义搜索 + RSS + 评论上线
- **M3 (P3)**：UI 打磨完成，Lighthouse 达标
- **M4 (P4)**：Web 编辑器 MVP 可用
