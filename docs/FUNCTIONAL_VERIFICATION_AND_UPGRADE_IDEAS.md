# 功能验证与升级建议

## 验证结果

本地已执行：

```powershell
npm.cmd run build
npm.cmd run verify
```

结果：

- 构建成功，生成 4 个内容页。
- 验证通过 17 个 HTML 文件。
- `search-index.json` 包含 4 条内容记录。
- 首页、文章聚合页、标签页、图谱页、搜索索引、RSS、sitemap、robots 均已生成。

## 已补齐的常见功能

- `/posts/` 文章聚合页：方便像企业工程博客一样按时间浏览文章。
- `/feed.xml` RSS：方便订阅器、聚合器和自动化抓取。
- `/sitemap.xml` 与 `/robots.txt`：基础 SEO 和搜索引擎发现。
- canonical 与 Open Graph meta：减少重复 URL 问题，改善分享预览。
- 阅读时间：文章列表和正文页都显示 `min read`。
- 本页目录：根据二级标题生成锚点导航。
- 相关文章：按共享标签推荐。
- `npm.cmd run verify`：把常见产物验证变成一条命令。

## 企业博客参考

- Cloudflare Blog：有订阅入口、搜索、栏目分类、作者、日期、摘要和继续阅读。
- Stripe Engineering：强调文章摘要、作者/团队、发布时间、聚合页和 `Read more`。
- GitHub Blog：有搜索、分类页、Engineering 分类入口。
- Uber Engineering：有文章数量、分类筛选、搜索/过滤和工程专题分类。
- Shopify 文档侧明确每个 blog 自动生成 RSS/Atom feed，说明 RSS 对内容订阅仍是低成本高收益能力。

## 性价比最高的下一批升级

1. 评论系统
   - 推荐：Giscus 或 Utterances。
   - 收益：技术博客有互动能力。
   - 成本：低，不需要自建数据库。
   - 前提：需要 GitHub 仓库和公开 issue/discussion。

2. 代码块复制按钮
   - 收益：学习笔记和面试代码片段可用性明显提升。
   - 成本：低，只需要前端脚本增强。

3. 草稿与发布白名单
   - 收益：降低私密笔记误发布风险。
   - 成本：低，构建脚本已支持 `draft: true`，后续可加校验。

4. 全文搜索体验增强
   - 收益：笔记多了以后非常关键。
   - 成本：中，可先做标题/标签权重，再考虑 Pagefind 或 Fuse.js。

5. 文章模板与分类规范
   - 收益：长期写作更稳定，也方便面试复盘沉淀。
   - 成本：低，增加 `templates/` 和写作说明即可。

6. 图片与附件规范
   - 收益：Obsidian 笔记常有图片，提前规范可避免迁移混乱。
   - 成本：中，建议统一 `content/assets/` 或 `public/assets/`。

7. 部署健康检查页
   - 收益：上线后验证简单。
   - 成本：低，生成 `/healthz/index.html` 或静态 `healthz.txt`。

8. 站内专题页
   - 收益：把 Java 后端、AI 项目、面试准备等组织成可读路线。
   - 成本：中，主要是内容整理。

## 暂不建议第一阶段做的功能

- 完整论坛：需要账号、反垃圾、邮件、数据库和长期运营。
- 后台 CMS：会和 Obsidian 写作流冲突。
- 登录权限：公开博客第一版不需要，且会增加反向代理复杂度。
- 复杂数据统计：部署前期先用服务日志或轻量分析即可。

## 下一步建议

短期优先级：

1. 增加代码块复制按钮。
2. 增加 `templates/post.md`、`templates/note.md`。
3. 增加 `draft: true` 构建校验和发布前检查。
4. 确认 GitHub 仓库后接 Giscus 评论。
5. 网络稳定后，把 Renderer 替换为 Quartz 4。
