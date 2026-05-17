# 多会话协作约定

## 为什么会覆盖

当前仓库还没有提交基线，而且多个会话同时修改 `scripts/build.mjs`、`public/styles.css`、`public/app.js` 这类核心文件。后写入的一方会把前一方的局部实现覆盖，尤其是当两个会话都在重写模板或整份 CSS 时。

## 避免方式

- 每轮大改前先看 `git status --short`。
- 同一时间尽量只让一个会话改同一组文件。
- 如果要并行，提前约定文件归属：
  - UI 会话：`public/styles.css`、`public/app.js`。
  - 构建会话：`scripts/build.mjs`。
  - 文档会话：`docs/`。
- 大改完成后及时 commit，形成恢复点。
- 另一个会话开始前先 `git diff --stat` 或查看最新文件内容。
- 避免用脚本整文件覆盖 UTF-8 中文文档，优先用 `apply_patch`。

## 推荐节奏

```text
小步修改
  -> npm.cmd run build
  -> 临时 HTTP 验证
  -> git diff 检查
  -> commit
  -> 下一个会话继续
```

## 当前易冲突文件

- `quartz/styles/custom.scss` — 自定义视觉增强
- `quartz.layout.ts` — 页面布局
- `quartz.config.ts` — 站点配置
- `docs/UI_DECORATION_RESEARCH.md` — UI 设计决策
