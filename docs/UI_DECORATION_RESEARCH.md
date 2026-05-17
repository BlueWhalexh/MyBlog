# UI Decoration Research

## 本轮定位

你希望博客不仅功能完整，也有“装修感”。因此第一阶段不追求极简，而是采用：

```text
Digital Garden 信息结构
  + macOS 风格玻璃质感
  + 文档站阅读效率
  + 少量开发者实验室氛围
```

## 参考方向

### 1. Digital Garden / Obsidian Garden

适合本项目的核心，因为内容来自 Obsidian，文章之间天然有双链、反链和图谱。

可借鉴元素：

- 左侧 Finder/Explorer 文件树。
- 右侧本页目录、反链、相关内容、局部图谱。
- 内链高亮、标签聚合、全局搜索。
- 内容不是线性博客流，而是可探索的知识网络。

### 2. macOS Workspace

适合增强“装修感”，但不让页面太炫。

可借鉴元素：

- 半透明玻璃顶栏。
- 圆角窗口、三色窗口按钮。
- 柔和阴影和分层面板。
- Paper / Dusk 主题切换。
- 类 Finder 的侧栏导航。

### 3. Docs Workspace

适合技术博客的可读性。

可借鉴元素：

- `Ctrl+K` 搜索。
- 左侧导航 + 右侧上下文。
- 代码块、callout、阅读模式。
- RSS、sitemap、文章列表。

### 4. Terminal Lab

后续可作为个性模块，而不是全站主风格。

可借鉴元素：

- 项目状态面板。
- 最近部署/构建日志。
- 命令片段和后端服务状态。
- AI workflow / Docker / Java 项目专题入口。

## 当前实施

- 使用三栏 Digital Garden 布局。
- 首页加入 Mac 风格 Hero 和站点统计。
- 文章区包裹为 macOS 窗口。
- 顶栏加入 Paper / Dusk 主题切换。
- 保留 RSS、sitemap、文章列表。
- 图谱 hover 使用 `r/stroke-width/fill`，避免 `transform: scale()` 造成节点跳动。

## 性能取舍

第一版 Mac 风格曾使用大面积 `backdrop-filter`、多层径向渐变、固定网格背景、sticky 三栏和大阴影。视觉更像玻璃，但 Windows 浏览器滚动成本较高。

当前调整：

- 移除所有 `backdrop-filter`。
- 移除多层 `radial-gradient` 背景。
- 顶栏和左右栏取消 sticky。
- 阴影减轻。
- 图谱 hover 只变 `fill/stroke-width`，不改变坐标和 transform。
- 增加 `prefers-reduced-motion` 兜底。

原则：保留 macOS 的窗口、圆角、层次和主题切换，但避免实时模糊和大面积重绘。

后续所有 UI 美化默认遵守这个原则：**先保证滚动、搜索、hover 和移动端流畅，再增加装饰**。

## 后续装修优先级

1. 增加 callout 样式：Note / Warning / Interview / Project。
2. 增加代码块标题和复制按钮。
3. 首页增加“项目状态 Dock”：PaiFlow、Java 后端、AI 工具、面试准备。
4. 图谱增加 tooltip 和当前页邻居高亮。
5. 做一个可选 Terminal Lab 首页模块。
