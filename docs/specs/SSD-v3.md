# SSD v3: 技术社区平台

## 定位

从"个人静态知识库"演进为"个人驱动的技术社区平台"。

作者（hxue）维护知识库和博客，访客可注册、讨论、提问；平台本质是作者的公开技术空间，而非多人协作 Wiki。

**核心用途（不变）**：
1. 维护个人知识库（Obsidian → Quartz 静态渲染，这套保持不动）
2. 个人博客

**V3 新增**：
3. 论坛 / 讨论区（用户注册、发帖、回复、点赞）
4. 问答（访客可对博客文章提问，作者回复）

---

## 架构决策

### 不替换 Quartz，引入后端

Quartz 静态渲染已经稳定、SEO 友好、CJK 完善。V3 不重写渲染层，而是在同一 repo 里增加后端服务：

```
MyBlog/
├── content/             ← Obsidian 同步来的 Markdown（不变）
├── public/              ← Quartz 构建产物（不变）
├── quartz/              ← Quartz 核心（不变）
├── server/              ← 新增：后端服务
│   ├── src/
│   │   ├── routes/      ← API 路由
│   │   ├── models/      ← 数据模型
│   │   ├── middleware/  ← auth、rate limit
│   │   └── index.ts     ← 服务入口
│   ├── prisma/          ← 数据库 schema（Prisma ORM）
│   └── package.json
└── scripts/             ← 构建和部署脚本（已有，扩展）
```

### 服务分离

| 服务 | 技术 | 端口 | 职责 |
|------|------|------|------|
| 静态博客 | scripts/serve.mjs（已有） | 3010 | Quartz 静态文件 |
| API 后端 | Hono + Node.js | 3011 | 论坛 CRUD、用户 auth |
| 数据库 | PostgreSQL | 5432（内网） | 用户、帖子、回复 |

nginx 统一入口：
- `hjhxh.site/*` → 静态博客（3010，已有）
- `hjhxh.site/api/*` → API 后端（3011，新增）
- `hjhxh.site/forum` → 前端入口（静态 SPA，由 API 驱动）

### 前端策略

论坛前端是轻量 SPA，**编译后放进 `public/forum/`**，由 Quartz 静态服务一同 serve。技术栈：Preact + Vite，不引入 Next.js 等重框架。

---

## 阶段划分

| 阶段 | 主题 | 估计工作量 |
|------|------|-----------|
| P1 | 后端基础设施（DB + Auth + 基础 CRUD API） | 中 |
| P2 | 论坛前端 + 集成到博客站 | 中 |
| P3 | 问答功能（文章关联提问） | 小 |
| P4 | AI 小工具（可选，延后） | 待定 |

---

## P1: 后端基础设施

### 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 框架 | Hono (Node.js) | 轻量、TypeScript 原生、比 Express 更现代 |
| ORM | Prisma | 类型安全、migration 方便 |
| 数据库 | PostgreSQL | 单服务器 Docker 部署，比 SQLite 更利于后期扩展 |
| Auth | JWT（access + refresh token） | 无状态，符合 API 优先设计 |
| 密码 | bcrypt | 标准 |

### 数据模型（初版）

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  email        String   @unique
  passwordHash String
  role         Role     @default(MEMBER)
  createdAt    DateTime @default(now())
  posts        Post[]
  replies      Reply[]
}

enum Role { ADMIN MEMBER }

model Post {
  id         Int      @id @default(autoincrement())
  title      String
  content    String
  authorId   Int
  author     User     @relation(fields: [authorId], references: [id])
  category   String
  tags       String[]
  pinned     Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  replies    Reply[]
  likes      Int      @default(0)
}

model Reply {
  id        Int      @id @default(autoincrement())
  content   String
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  postId    Int
  post      Post     @relation(fields: [postId], references: [id])
  createdAt DateTime @default(now())
  likes     Int      @default(0)
}
```

### API 端点（P1）

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
DELETE /api/auth/logout

GET    /api/posts
POST   /api/posts          (需登录)
GET    /api/posts/:id
PATCH  /api/posts/:id      (作者 or ADMIN)
DELETE /api/posts/:id      (作者 or ADMIN)

GET    /api/posts/:id/replies
POST   /api/posts/:id/replies   (需登录)
DELETE /api/replies/:id         (作者 or ADMIN)

POST   /api/posts/:id/like      (需登录)
```

### 验收标准（P1）

- [ ] `server/` 目录结构清晰，TypeScript 无报错
- [ ] `prisma migrate dev` 成功建表
- [ ] `npm run dev:server` 在 3011 起服务
- [ ] 注册 → 登录 → 获取 JWT → 发帖 → 回复全链路 curl 测试通过
- [ ] 未登录请求受保护端点返回 401
- [ ] 非作者修改他人帖子返回 403
- [ ] 密码 bcrypt hash，不明文存储
- [ ] Rate limit 生效（注册/登录 endpoint）

---

## P2: 论坛前端

### 页面

| 路由 | 说明 |
|------|------|
| `/forum` | 帖子列表（分类、排序） |
| `/forum/post/:id` | 帖子详情 + 回复 |
| `/forum/new` | 发帖（需登录） |
| `/forum/login` | 登录/注册 |
| `/forum/profile` | 个人资料 |

### 技术细节

- Preact + Vite，构建产物输出到 `public/forum/`
- Markdown 渲染：marked 或 unified（与 Quartz 风格一致）
- 暗色/亮色跟随博客主题（读 `document.documentElement[saved-theme]`）
- 无 SSR，纯 SPA（对 SEO 要求不高，论坛内容主要靠登录用户产生）

### 验收标准（P2）

- [ ] 帖子列表、详情、发帖、回复全功能可用
- [ ] 暗色/亮色主题与主站一致
- [ ] 移动端布局正常（最小 375px 宽度）
- [ ] 未登录只能读，登录后可写
- [ ] 发帖支持 Markdown，预览正常
- [ ] 页面与主站风格一致（字体/颜色沿用 Quartz 主题变量）

---

## P3: 问答功能

博客文章关联提问：每篇文章页底部有一个"对本文提问"入口，进入论坛发帖时自动关联 `sourceSlug`（文章路径）。文章页展示该文章关联的未回答问题数量。

### 数据模型扩展

```prisma
model Post {
  // ...
  sourceSlug  String?   // 关联的博客文章 slug，null 表示独立帖子
  type        PostType  @default(DISCUSSION)
}

enum PostType { DISCUSSION QUESTION }
```

### 验收标准（P3）

- [ ] Quartz 文章页（通过 Quartz 组件）展示关联问题数
- [ ] 点击进入论坛能筛选出该文章的问题
- [ ] 问答与普通讨论在列表中有区分显示

---

## P4: AI 小工具（可选，V3 后期）

在论坛/博客功能稳定后按需加入，每个工具独立评估，不影响主干：

| 工具 | 功能 | 实现复杂度 |
|------|------|-----------|
| 回复草稿辅助 | 输入问题/帖子内容，AI 给出回复草稿 | 低（调 Claude API，client-side） |
| 内容摘要 | 长帖子自动生成 TL;DR | 低 |
| 标签推荐 | 发帖时 AI 建议 tags | 低 |
| 论坛内 RAG 问答 | 基于帖子+博客内容回答问题 | 高（需 embedding 索引） |

原则：每个工具独立开关，不影响核心论坛功能；API 成本可控后再上线。

---

## 非目标（V3 明确不做）

- 独立语义搜索系统（成本高，Quartz 自带 flexsearch 够用）
- 多用户协作编辑（单作者博客不需要）
- 商业化（付费会员、广告）
- 全功能社区（Stack Overflow 规模）
- Obsidian 同步流程改变（V2 已经稳定）

---

## 服务器部署规划

当前服务器 `146.190.97.62`：
- 3010: 静态博客（已有）
- 3001: mypersonweb（不动）
- 新增 3011: API 后端
- 新增 PostgreSQL: Docker 容器（内网 5432）

nginx 扩展配置：`/etc/nginx/sites-available/tech-blog`
```nginx
# 已有：静态博客
location / { proxy_pass http://127.0.0.1:3010; }

# 新增：API
location /api/ { proxy_pass http://127.0.0.1:3011; }

# 新增：论坛 SPA fallback（SPA 路由需 try_files）
location /forum/ {
    try_files $uri $uri/ /forum/index.html;
}
```

---

## 开发顺序建议

1. `server/` 目录搭架子（Hono + Prisma + PostgreSQL Docker）
2. Auth 端点 + 单元测试
3. Post/Reply CRUD + 集成测试
4. 论坛前端（Preact + Vite）
5. 接入主站（nginx 配置 + Quartz 侧导航链接）
6. P3 问答功能
7. 按需评估 P4

---

## 里程碑

| 里程碑 | 交付物 |
|--------|--------|
| M1 | API 服务可运行，auth + post CRUD 通过测试 |
| M2 | 论坛前端上线，hjhxh.site/forum 可访问 |
| M3 | 问答功能与博客文章联通 |
| M4 | 至少 1 个 AI 小工具上线（可选） |
