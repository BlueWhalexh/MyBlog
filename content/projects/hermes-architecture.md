---
title: Hermes 架构说明
date: 2026-05-17
tags:
  - Hermes
  - 架构
description: 个人技术博客的 Hermes 分层架构。
---

# Hermes 架构说明

Hermes 用来描述这个博客系统的责任边界：

| Layer | 责任 |
| --- | --- |
| Horizon | 面向访问者的博客、笔记、搜索、标签、图谱 |
| Editor | Obsidian 本地写作与内容筛选 |
| Renderer | Markdown 到静态站点的构建层，目标是 Quartz 4 |
| Middleware | Nginx/Caddy 反向代理与路由 |
| Estate | 服务器资产、目录、容器、数据卷 |
| Safeguards | 备份、回滚、端口预检和最小化变更 |

当前本地原型先实现 Horizon、Editor、Renderer 的最小闭环。服务器上的 Middleware、Estate、Safeguards 会在部署前单独确认。
