# Exit Gates

每种任务类型在声明"完成"前必须通过对应的退出检查。

## 通用门槛（所有任务）

- [ ] `npm run check` 通过（TypeScript 无错误）
- [ ] `npm run build` 通过（构建成功）
- [ ] `npm run verify` 通过（HTML/RSS/sitemap 验证）
- [ ] `git diff --stat` 只包含意图内的文件变更

## 内容变更（新增/修改文章）

- [ ] 通用门槛全部通过
- [ ] dry-run 确认无私密文件
- [ ] frontmatter 包含 title, date, tags
- [ ] draft 状态正确（发布 = false）
- [ ] 中文路径在 sitemap 中存在

## UI/样式变更

- [ ] 通用门槛全部通过
- [ ] 无新增自定义 JS（如必要，使用 afterDOMLoaded + addCleanup）
- [ ] 无 backdrop-filter 或重量级 CSS 动画
- [ ] 暗色/亮色主题均无视觉异常
- [ ] SPA 导航两次后无重复 DOM 元素

## 部署/服务器变更

- [ ] 通用门槛全部通过
- [ ] 本地 git push 成功
- [ ] 服务器 git pull + build + verify 通过
- [ ] curl 抽查：首页、sitemap、一个中文路径、一个英文路径均 200
- [ ] 未影响 mypersonweb (3001) 和 PaiFlow

## 文档变更

- [ ] build + verify 通过（文档不需要 tsc check）
- [ ] 文件路径引用与实际位置一致
- [ ] AGENTS.md 接手先读列表是否需要更新
- [ ] 无内部矛盾（新内容不与 canonical/ 中其他文档冲突）

## Obsidian 同步配置变更

- [ ] dry-run 显示合理的文件范围
- [ ] 正式同步后 build + verify 通过
- [ ] excludePathParts 仍排除 private/draft/secret/.obsidian/.trash
- [ ] 新增内容无 BOM 编码问题
