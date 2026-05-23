# SSD v3: 智能化与多端

## 定位

V2 完成自动化发布 + 评论 + 统计基础设施。V3 聚焦从"被动展示"到"主动服务"的跨越：
- 让读者用语义检索找到需要的内容（而非关键词匹配）
- 让用户能问"X 怎么实现的"并得到基于本站内容的答案
- 让作者能从手机/Web 写作（脱离桌面 Obsidian 限制）

## 阶段划分

| 阶段 | 主题 | 依赖 |
|------|------|------|
| P1 | 语义搜索 | 无 |
| P2 | AI 问答（RAG） | P1 的 embedding 索引 |
| P3 | 多端写作（独立项目） | 与博客架构正交 |

---

## P1: 语义搜索

### 目标

读者输入自然语言查询（"分布式事务如何处理"），返回最相关的笔记，而非依赖关键词字面匹配。

### 范围

- 构建时生成内容 embedding 索引
- 客户端加载索引，做余弦相似度检索
- 与现有 flexsearch 共存：默认仍用 flexsearch（更快），增加"语义搜索"切换按钮

### 技术方案

**Embedding 来源（择一）**：

| 方案 | 优点 | 缺点 |
|------|------|------|
| OpenAI `text-embedding-3-small` | 质量好，便宜 | 需 API key，每次 build 调 API |
| 本地模型 (`@xenova/transformers` + `all-MiniLM-L6-v2`) | 零外部依赖 | 模型体积大，build 慢 |
| BGE 中文模型（HuggingFace inference API） | CJK 友好 | 需 token，速率限制 |

**推荐**：OpenAI text-embedding-3-small（中英双语都好，$0.02/1M tokens，264 篇笔记估算 $0.05/次 build）。

**索引格式**：

```json
{
  "version": 1,
  "model": "text-embedding-3-small",
  "dimension": 1536,
  "items": [
    {
      "slug": "imported/Docker入门",
      "title": "Docker 入门与核心概念",
      "vector": [0.0123, -0.0456, ...]
    }
  ]
}
```

**客户端加载策略**：
- 索引 JSON 文件压缩 + gzip，264 项 × 1536 维 × 4 字节 ≈ 1.6 MB（可接受）
- 仅在用户点击"语义搜索"切换按钮时按需加载（`<link rel="prefetch">`）
- 查询时本地用 OpenAI embedding（需用户填 API key）或调用代理 endpoint

**风险**：客户端持有 OpenAI API key 不可行。需要：
- 后端代理 endpoint（小型 serverless function：Vercel/Cloudflare Workers）
- 或退化到"基于关键词扩展"的方案（用 LLM 生成同义词，然后用 flexsearch 查）

### 验收标准

- [ ] Build 时生成 `static/embeddings.json`
- [ ] 用户切换到"语义搜索"模式，输入查询后返回 top 10 相关笔记
- [ ] 中文查询效果显著优于 flexsearch（人工对比 5 个 query）
- [ ] 索引大小 ≤ 3 MB（gzip 后）
- [ ] 不影响默认搜索性能（lazy load）

### 实施步骤

1. 决定 embedding 提供方（建议 OpenAI）
2. `scripts/build-embeddings.mjs`：读 content/imported/*.md → 切片 → embed → JSON
3. CI: 在 `npm run build` 后追加 `npm run build-embeddings`，secret 配 `OPENAI_API_KEY`
4. `quartz/components/SemanticSearch.tsx`：新组件，UI 切换按钮 + 加载索引 + 计算相似度
5. 后端代理 endpoint（Cloudflare Workers）：接收 query → 调 OpenAI embedding → 返回向量
6. 客户端用代理返回的向量，本地与索引做相似度计算

---

## P2: AI 问答（RAG）

### 目标

用户提问，系统检索本站相关笔记作为上下文，调用 LLM 生成答案并附引用链接。

### 范围

- 复用 P1 的 embedding 索引
- 加 `/ask` 页面：单输入框 + 流式回答
- 答案带 footnote 链接到源笔记

### 技术方案

- **检索**：query → embed → top-5 笔记
- **生成**：拼 system prompt + 5 篇笔记 → Claude/GPT-4o-mini 流式响应
- **后端**：Cloudflare Workers / Vercel Edge Function
- **限流**：单 IP 每分钟 5 次（防滥用）

### 验收标准

- [ ] `/ask` 页可访问，输入问题流式返回答案
- [ ] 答案中有 footnote 链接，点击跳到源笔记
- [ ] 5 个示例问题人工评估：答案准确率 ≥ 80%
- [ ] 单次回答成本 ≤ $0.005
- [ ] 限流生效

### 风险

- API 成本可能超预算，需限流 + 监控
- 答案可能误导，需 disclaimer
- 隐私：用户 query 不应被永久存储

---

## P3: 多端写作（独立项目）

### 定位

**这不是博客 repo 内的功能**，而是一个独立项目（建议名 `BlueWhalexh/blog-editor`），通过 API 与 knowledge-base repo 交互。

### 目标

- 移动端 / Web 端可创建/编辑 Markdown 文章
- 通过 API 提交到 knowledge-base repo（自动 commit + push）
- 触发现有的 V2 自动部署链路

### 范围

**编辑器**：
- 轻量 SPA（Preact/React + CodeMirror）
- Markdown 实时预览
- 支持 frontmatter 编辑

**后端 API**：
- `POST /api/posts` — 创建/更新文章
- `GET /api/posts` — 列表
- `DELETE /api/posts/:slug` — 删除
- 后端用 GitHub API 操作 knowledge-base repo

**认证**：
- 单用户，简单 token-based auth
- Token 存 localStorage，每次请求带上
- 后端验证后调 GitHub API（用 fine-grained PAT）

### 技术栈

- 前端：Preact + CodeMirror 6 + Vite
- 后端：Cloudflare Workers / Hono
- 部署：Cloudflare Pages 或独立服务器

### 验收标准

- [ ] 移动端浏览器可流畅编辑（中文输入法不卡顿）
- [ ] 提交后 5 分钟内线上博客显示新文章
- [ ] Token 认证生效，未授权请求返回 401
- [ ] 不影响 Obsidian 桌面端写作流程

### 风险与注意事项

- 与 Obsidian 同步可能冲突（Obsidian → knowledge-base 与 Web 编辑器 → knowledge-base 双向写）
  - 解决：编辑器先 pull，再 push，冲突时让用户选
- Token 泄露风险：限制 token 仅能写 knowledge-base repo
- 移动端富文本输入体验需要测试

---

## 不在 V3 范围

- 多用户协作（单用户够用）
- 富文本所见即所得（保持 Markdown）
- Obsidian 插件开发（用 Obsidian 自身同步即可）
- 完整的 CMS（覆盖范围太大）

---

## 里程碑

- **M1 (P1)**：语义搜索上线，flexsearch + 语义双模式
- **M2 (P2)**：AI 问答 MVP，5 个 demo query 验证
- **M3 (P3)**：blog-editor 独立项目 v0.1，移动端可发布

---

## 决策记录（来自 V2 回顾）

| 议题 | 决策 | 原因 |
|------|------|------|
| P1 V2 写过的"语义搜索" | 移到 V3 P1 单独立项 | 实现复杂度需要单独迭代周期 |
| P4 V2 写过的"多端写作" | 移到 V3 P3，独立 repo | 与静态博客架构正交，不应在博客 repo 内 |
| 评论与统计在 V2 完成 | 保留 | 简单且独立，无后续依赖 |
| 自动化发布在 V2 完成 | 保留 | V3 所有阶段都依赖此基础设施 |
