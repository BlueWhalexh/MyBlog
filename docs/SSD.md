# SSD: 个人技术博客 / Obsidian 笔记站

## 目标

构建一个轻量、稳定、可长期维护的个人技术博客与公开笔记站，用于记录技术学习、项目复盘、面试准备和可分享材料。

## 第一版范围

- Markdown 内容发布。
- Obsidian 风格双链。
- 标签、搜索、反链和图谱入口。
- Git 推送式发布。
- 本地构建与预览。
- 服务器部署预案文档。

## 非目标

- 第一版不做完整论坛。
- 第一版不做账号系统。
- 第一版不做私人 vault 云同步。
- 第一版不自动发布未确认内容。

## 内容规范

发布内容放在 `content/`，frontmatter 推荐字段：

```yaml
---
title: 文章标题
date: 2026-05-17
tags:
  - Java
  - 项目复盘
description: 一句话摘要
draft: false
---
```

`draft: true` 内容不应进入发布产物。

## 发布流程

```text
Obsidian 私人 vault
  -> 选择可公开笔记
  -> 复制/整理到 content/
  -> git add / commit / push
  -> 服务器自动拉取、构建、发布
```

## 验收标准

- 本地 `npm.cmd run build` 成功。
- 首页、文章页、标签页、图谱页可访问。
- 中文标题、代码块、表格和双链正常渲染。
- `search-index.json` 生成并可用于搜索。
- 文档明确服务器端口和 PaiFlow 数据卷约束。
