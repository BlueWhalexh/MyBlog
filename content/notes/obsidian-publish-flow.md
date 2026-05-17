---
title: Obsidian 发布流程
date: 2026-05-17
tags:
  - Obsidian
  - 发布流程
  - Git
description: 使用 Git 推送发布公开笔记，避免云同步和误发布私密内容。
---

# Obsidian 发布流程

推荐流程：

```text
Obsidian 私人 vault
  -> 选择可公开笔记
  -> 复制/整理到博客项目 content/
  -> git add / commit / push
  -> 服务器自动拉取、构建、发布
```

第一版先手动发布，后续可以补一个 `publish.ps1`：

```powershell
git add .
git commit -m "更新博客笔记"
git push
```

这个流程的关键收益是：发布动作是显式的，版本可回滚，也不会把私人 vault 直接同步到服务器。

相关：[[posts/quartz-research|脚手架调研]]。
