---
title: 个人技术博客脚手架调研
date: 2026-05-17
tags:
  - 技术选型
  - Quartz
  - Blog
description: Quartz、Astro、Docusaurus、Ghost 和论坛系统的第一版取舍。
---

# 个人技术博客脚手架调研

第一版选择 **Quartz 4 + Obsidian Markdown + Git 推送**。

## 为什么是 Quartz

- 贴近 Obsidian：Markdown、双链、反链、图谱这些能力天然适配。
- 部署简单：静态构建后可以由 Nginx/Caddy 或轻量容器托管。
- 风险较低：不需要数据库、账号系统和邮件服务。

## 暂不选择完整论坛

Flarum、Discourse、NodeBB 更适合社区系统。它们通常需要数据库、用户体系、邮件、反垃圾和持续维护。当前目标是个人技术博客和公开笔记，所以论坛先作为后续扩展。

## 后续备选

如果未来更强调“产品化文档站”，可以考虑 Astro/Starlight 或 Docusaurus。当前内容结构会尽量保持 Markdown/frontmatter 兼容，方便迁移。
