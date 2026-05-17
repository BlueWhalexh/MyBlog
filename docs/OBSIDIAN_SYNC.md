# Obsidian 同步说明

## 推荐方式

不要直接同步整个 vault。建议在 Obsidian 里维护一个专门用于公开发布的文件夹，例如：

```text
PublicBlog/
  Java/
  AI/
  Projects/
```

然后只同步这个公开文件夹到博客项目：

```powershell
.\scripts\sync-obsidian.ps1 -VaultPath "D:\Your\ObsidianVault" -SourceSubdir "PublicBlog" -DryRun
```

确认列表没问题后再真正同步：

```powershell
.\scripts\sync-obsidian.ps1 -VaultPath "D:\Your\ObsidianVault" -SourceSubdir "PublicBlog"
npm.cmd run build
```

如果要连图片一起试：

```powershell
.\scripts\sync-obsidian.ps1 -VaultPath "D:\Your\ObsidianVault" -SourceSubdir "PublicBlog" -IncludeImages
npm.cmd run build
```

同步后的 Markdown 会进入：

```text
content/imported/
```

图片会进入：

```text
public/obsidian-assets/
```

## 新增笔记规则

这个项目的长期写作入口是本地 Obsidian 笔记库，而不是项目目录。

```text
Vault: D:\Document\Notes
当前公开源目录: 知识库
同步目标: content/imported
```

新增技术博客、项目复盘、AI Coding 实战、面试路线等内容时，先在 `D:\Document\Notes` 中按笔记库规则创建或整理 Markdown，再放入可公开的源目录。确认可以公开后，再通过 `sync-config.json` 同步进入项目。

标准流程：

1. 在 Obsidian vault 写作和维护双链、标签、frontmatter。
2. 确认笔记不含私密信息、公司资料、账号、密钥、token。
3. 将可公开内容放在当前公开源目录 `知识库` 下，或后续约定的公开子目录。
4. 先执行 dry-run 检查将要同步的文件。
5. 正式同步到项目，再执行构建和验证。
6. 通过 Git commit/push 发布，不手工散传文件到服务器。

常用命令：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
npm.cmd run sync
npm.cmd run check
npm.cmd run build
npm.cmd run verify
```

如果未来需要让某类 Obsidian 文章进入 `/posts/` 聚合页，应优先调整公开源目录、同步目标或增加受控的 promotion 流程；不要绕过 Obsidian 直接在项目 `content/posts/` 长期起草。

## 性能影响

内容多本身不是问题，主要看三个点：

- **页面数量**：几百篇 Markdown 静态构建通常没问题；几千篇时构建和图谱会变慢。
- **搜索索引大小**：当前每篇只截取前 3000 字进入 `search-index.json`，避免前端一次加载太多全文。
- **图片大小**：图片最影响加载速度。建议先压缩，再同步；大图不要直接进仓库。
- **图谱规模**：节点很多时不建议全站图谱一次性画太多，后续应改为当前页邻域图谱。

## 建议阈值

- 100 篇以内：当前实现足够。
- 100-500 篇：建议保持搜索索引截断，图片压缩。
- 500 篇以上：建议按目录分批发布，图谱只显示当前页邻域。
- 1000 篇以上：建议迁移到正式 Quartz 或接入更强的搜索索引方案。

## 避免误发布

脚本默认排除路径中包含这些词的文件：

```text
.obsidian
.trash
private
Private
draft
Draft
secret
Secret
```

但最终仍建议你只同步专门的公开目录，不要直接同步整个 vault。

## 当前已验证

用 `content/` 模拟 vault 跑过 dry-run：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -VaultPath content -DryRun
```

脚本只列出文件，不会写入。实际使用时建议先 dry-run 再正式同步。

## 本机同步记录

已从本机 Obsidian vault 同步技术内容：

```text
Vault: D:\Document\Notes
SourceSubdir: 知识库
Destination: content/imported
Markdown: 252 篇
Images: 本轮未同步
```

没有直接同步整个 vault，因为 dry-run 显示根目录会包含 daily、实习、todo、模板等不适合公开发布的内容。

本轮构建结果：

```text
总页面数: 256
同步页面数: 252
搜索索引: 约 795 KB
构建时间: 约 1.4-1.8 秒
```

性能保护：

- 每篇文章进入搜索索引的正文截断到前 3000 字。
- 右侧局部图谱最多显示 32 个节点。
- 全局图谱最多显示 96 个节点。
- 左侧 Finder 每个分组最多显示 36 条，其余通过文章页或搜索进入。

## 当前增量同步策略

同步规则已经从脚本里抽到项目根目录的 `sync-config.json`。以后优先改配置，不直接改脚本：

```json
{
  "vaultPath": "D:\\Document\\Notes",
  "sourceSubdir": "知识库",
  "destination": "content/imported",
  "includeImages": false,
  "deleteMissing": false,
  "includeExtensions": [".md"],
  "excludePathParts": [".obsidian", ".trash", "private", "draft", "secret"]
}
```

推荐日常使用：

```powershell
npm.cmd run sync
```

或双击项目根目录的：

```text
sync-and-build.cmd
```

这会执行：

1. 按 `sync-config.json` 过滤规则扫描 Obsidian。
2. 使用增量模式同步新增或变更的 Markdown。
3. 重新构建静态站点。

如果只是检查将要同步什么，不写入文件：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
```

注意：网页上的“同步按钮”不能在公网静态站点直接操作本地 vault。后续如果要做网页按钮，只应放在本地开发服务里，并限制为 `127.0.0.1` 可用。
