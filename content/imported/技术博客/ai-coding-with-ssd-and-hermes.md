---
title: AI Coding 实战：从 Prompt 到 SSD 和 Hermes 架构
date: 2026-05-17
tags:
  - 软件工程
  - SSD
  - Hermes
  - 项目复盘
  - AI Coding
description: 复盘一次真实 AI Coding 协作：为什么只写 prompt 不够，如何用 SSD、架构分层、运行手册和 Git 流程把 AI 变成工程协作者。
draft: false
type: post
status: published
---

## 背景

AI Coding 很容易被理解成“给模型一个 prompt，让它帮我写代码”。但实际做项目时，我越来越觉得 prompt 只是入口，不是系统。

这次个人技术博客的迭代就是一个很典型的例子：它不是简单生成一个页面，而是涉及内容同步、Quartz 构建、UI 风格、nginx 反代、DNS、线上静态服务、GitHub 流程和回滚策略。

如果只靠一句“帮我做个博客”，AI 很容易做出一个看起来能跑、但上线和维护都很脆弱的东西。真正有效的 AI Coding，需要把“需求、边界、验证、部署、文档”都结构化。

## Prompt 不够

Prompt 可以告诉 AI 当前要做什么，但它解决不了几个关键问题：

1. 项目长期目标是什么？
2. 哪些内容不能碰？
3. 哪些服务不能停？
4. 什么算完成？
5. 怎么验证？
6. 出问题怎么回滚？

这些问题如果只放在聊天上下文里，很容易随着会话切换丢失。AI 会越来越像“临时工”，每次都需要重新解释项目。

所以我现在更愿意把 prompt 上移成文档和流程。

## SSD 是需求锚点

这里的 SSD 可以理解为系统规格说明。它不需要很厚，但要回答几个问题：

- 第一版做什么？
- 第一版不做什么？
- 内容规范是什么？
- 发布流程是什么？
- 验收标准是什么？

在这个博客项目里，SSD 明确了第一版只做个人技术博客和 Obsidian 公开笔记站，不做论坛、不做账号系统、不做私人 vault 云同步、不自动发布未确认内容。

这几个“非目标”非常重要。它们能阻止 AI 在实现时越做越大，也能阻止我自己在开发过程中被新想法带偏。

## Hermes 是架构边界

有了 SSD 之后，还需要一个架构边界。我把这个项目拆成 Hermes 分层：

| 层 | 关注点 |
| --- | --- |
| Horizon | 用户看到的页面体验 |
| Editor | Obsidian 写作和公开内容筛选 |
| Renderer | Quartz 4 构建静态站点 |
| Middleware | nginx、域名、HTTPS |
| Estate | 服务器目录、端口、旧服务 |
| Safeguards | 备份、验证、回滚 |

这个分层最大的价值是调试时不慌。

比如域名接入时，`hjhxh.site` 一开始访问不到。按 Hermes 看，可能是 DNS、nginx、博客进程、Quartz 构建或 HTTPS。逐层验证后发现：HTTP 反代是好的，DNS 还在传播，HTTPS 还没证书。这样就不会误改代码。

再比如文章索引 404。首页、RSS、sitemap、`contentIndex.json` 都是 200，但具体文章 404。最后定位到生产静态服务只支持真实文件路径，不支持 Quartz 的 pretty URL。修复方式不是改文章，也不是改 sitemap，而是让服务脚本支持：

```text
/posts/foo -> public/posts/foo.html
/imported/xxx/ -> public/imported/xxx/index.html
```

中文 URL 还需要 `decodeURIComponent`，否则 sitemap 里的编码路径无法匹配磁盘上的中文文件名。

## AI Coding 的正确输入

这次实践后，我觉得 AI Coding 的输入不应该只有 prompt，而应该至少包含：

1. `AGENTS.md`：接手规则和项目边界。
2. `docs/SSD.md`：需求范围和非目标。
3. `docs/HERMES_ARCHITECTURE.md`：架构分层。
4. `docs/RUNBOOK.md`：构建、验证、部署和回滚。
5. `docs/COLLABORATION.md`：多会话协作，避免覆盖。
6. `progress.md`：历史问题和修复记录。

这些文件让 AI 有长期记忆。下一轮接手时，AI 不需要靠猜，而是先读文档，再做判断。

## AI Coding 的上线流程

我这次也踩了一个流程问题：为了快速修线上，我直接把文件同步到了服务器。它能解决眼前问题，但不适合作为长期流程，因为 GitHub 没有记录，服务器状态和本地状态容易分叉。

更合理的流程应该是：

```text
本地修改
  -> npm.cmd run check
  -> npm.cmd run build
  -> npm.cmd run verify
  -> git status / git diff
  -> git add / commit
  -> git push origin main
  -> 服务器 git pull
  -> 服务器 npx quartz build
  -> 线上抽样验证
```

如果未来要更进一步，可以加 GitHub Actions，让 push 后自动 SSH 到服务器构建。但即使没有 CI，也应该保证服务器只从 Git 更新，而不是手工复制零散文件。

## 结论

AI Coding 的重点不是“让 AI 写代码”，而是“让 AI 在明确边界内做工程协作”。

Prompt 负责表达当前意图，SSD 负责约束范围，Hermes 负责拆清层次，Runbook 负责验证和上线，Git 负责留下可回滚的历史。

当这些东西都在，AI 才不是一次性的代码生成器，而是一个可以接手项目、定位问题、执行变更、补充文档的工程伙伴。
