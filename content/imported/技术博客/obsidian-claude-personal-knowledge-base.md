---
title: Obsidian + Claude 构建自我知识库
date: 2026-05-17
tags:
  - Obsidian
  - AI
  - 知识管理
  - 项目复盘
description: 记录我如何用 Obsidian、AI 编程助手和 Quartz，把私人笔记整理成可公开、可搜索、可持续迭代的个人知识库。
draft: false
type: post
status: published
---

## 背景

我之前的笔记主要散落在 Obsidian 里：有 Java 后端八股文、场景题、AI 大模型、项目复盘、面试准备，也有 daily、todo、实习记录和一些不适合公开的内容。

这类笔记的问题不是“没有内容”，而是内容太多之后，很难被稳定复用。临近面试时，我需要的是一个可以快速检索、可以按主题浏览、可以从一篇笔记跳到相关笔记的知识网络，而不是一堆孤立 Markdown 文件。

所以这个博客的目标不是做一个完整论坛，也不是把整个 Obsidian vault 直接公开，而是构建一个可筛选、可发布、可回滚的公开知识库。

## 为什么不是直接同步整个 vault

直接同步整个 vault 看起来省事，但风险很高：

1. 私密内容容易误发布。
2. daily、todo、模板、实习记录会污染公开站点。
3. 图片、附件和临时草稿会让仓库变重。
4. 公开内容和私人内容边界不清，后面维护会越来越乱。

现在的做法是把 Obsidian 里的公开源目录当成第一道边界，只把确认可以公开的笔记放入 `D:\Document\Notes\知识库`，再由同步脚本进入项目 `content/imported`。同步脚本也会排除 `.obsidian`、`.trash`、`private`、`draft`、`secret`、`daily`、`todo`、`template`、`intern` 这些路径。

这其实是整个系统最重要的安全设计：公开不是一个技术动作，而是一个筛选动作。

## 架构分层

我给这个项目起了一个内部名字：Hermes。它不是复杂架构，而是为了提醒自己不同层的责任边界。

| 层 | 责任 |
| --- | --- |
| Editor | 在 Obsidian 里写作，人工筛选公开内容 |
| Renderer | 用 Quartz 4 把 Markdown 构建成静态站点 |
| Horizon | 访问者看到的首页、文章、搜索、标签、图谱 |
| Middleware | nginx、域名、HTTPS、反向代理 |
| Estate | 服务器目录、端口、进程和旧服务边界 |
| Safeguards | 构建验证、回滚、DNS 和端口预检 |

这个分层带来的好处是，出问题时能快速定位。比如这次上线时，首页能打开但文章索引 404，问题不在 Obsidian，也不在 Quartz 构建，而是在生产静态服务没有把 pretty URL 映射到 `.html` 文件。

## AI 在这里做什么

Claude、Codex 这类工具最有价值的地方，不是帮我随便生成几段 Markdown，而是参与整个知识库工程化过程：

1. 读项目文档，理解边界。
2. 扫描内容结构，找出已有笔记和主题。
3. 补齐 `AGENTS.md`、`RUNBOOK.md`、`SSD.md` 这类接手文档。
4. 修改 Quartz 配置和样式。
5. 跑构建、验证、线上路由检查。
6. 把踩过的坑写回文档，避免下一轮重复犯错。

也就是说，AI 不是替代 Obsidian，而是给 Obsidian 加了一层“工程化整理能力”。Obsidian 负责长期输入和私人知识积累，AI 负责帮我把一部分内容整理成可以发布、可以验证、可以迁移的结构。

## 当前工作流

```text
Obsidian 私人写作
  -> 筛选可公开内容
  -> 放入 知识库 公开源目录
  -> npm.cmd run sync 同步到 content/imported
  -> npm.cmd run build
  -> npm.cmd run verify
  -> git commit / push
  -> 服务器 git pull / build
  -> hjhxh.site 访问
```

这个流程里我最看重三点：

1. 发布前必须本地构建和验证。
2. 发布动作走 Git，而不是手工散传文件。
3. 服务器只从 Git 状态更新，线上问题能回滚到上一个 commit。

## 我的体会

个人知识库最难的不是选工具，而是边界和节奏。

Obsidian 解决写作和连接，Quartz 解决公开展示，Git 解决版本和发布，AI 解决整理和自动化。它们合在一起之后，才像一个可以长期维护的系统。

如果只追求“赶紧发出来”，很容易把私人 vault、临时草稿、服务器配置和样式修改混在一起。短期看快，长期一定乱。

我现在更倾向于把这个博客当成一个小型软件项目来维护：有 SSD，有运行手册，有架构边界，有验证脚本，也有回滚方案。这样它不只是一个网页，而是我的长期知识基础设施。
