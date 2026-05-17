# Runbook

## 本地构建

```powershell
npm.cmd run build
```

构建产物输出到 `public/`（Quartz 4 默认目录）。

## 本地功能验证

```powershell
npm.cmd run verify
```

当前验证项包括：核心 HTML 页面、搜索索引、RSS、sitemap、robots、canonical、RSS link 和阅读时间字段。

## 本地预览

```powershell
npm.cmd run serve
```

## Obsidian 增量同步

日常同步优先使用：

```powershell
npm.cmd run sync
```

或双击项目根目录 `sync-and-build.cmd`。

同步源、目标目录和过滤规则在 `sync-config.json` 中维护。先检查不写入：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
```

默认地址：

```text
http://127.0.0.1:3010
```

也可以一条命令构建并预览：

```powershell
npm.cmd run preview
```

## 写作与发布

1. 在 Obsidian 私人 vault 写作。
2. 只选择可以公开的笔记。
3. 复制或整理到本项目 `content/`。
4. 本地构建检查。
5. Git 发布：

```powershell
git add .
git commit -m "更新博客笔记"
git push
```

## 部署前预检

只读检查建议：

```bash
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "ss -tulpn"
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'"
ssh -i C:\Users\xuehang\.ssh\do_digitalocean_ed25519 xuehang@146.190.97.62 "df -h"
```

如果普通用户看不到 80 端口进程，使用 sudo 前先确认权限和影响。

## 部署草案

- 目标目录：`/opt/tech-blog`
- 内部端口：`127.0.0.1:3010`
- 反向代理：确认 80 端口归属后再改。
- PaiFlow：`/opt/PaiFlow` 只读确认，不清理。

## 回滚

- 保留部署前反向代理配置。
- 新站异常时先移除新路由。
- 如果只是内容问题，回退 Git commit 后重新构建。
