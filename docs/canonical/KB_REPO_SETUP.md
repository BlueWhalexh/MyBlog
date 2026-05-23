# Knowledge-Base Repo 配置指南

V2 P1 自动化发布的知识库 repo 一次性配置流程。配置后日常只需 push 到 knowledge-base 就能自动部署。

---

## 架构

```
Obsidian vault
    ↓ (sync 脚本)
本地 knowledge-base/ 目录 (git clone of BlueWhalexh/knowledge-base)
    ↓ (git push)
BlueWhalexh/knowledge-base [GitHub]
    ↓ (notify-blog.yml → repository_dispatch)
BlueWhalexh/MyBlog Actions [deploy.yml]
    ↓ (build + rsync)
146.190.97.62:/opt/tech-blog/public/
```

---

## 一次性配置步骤

### 1. 创建 knowledge-base GitHub repo

1. 在 GitHub 创建新 repo：`BlueWhalexh/knowledge-base`，**private** 推荐（公开内容也建议 private 仓库 + 公网构建产物）
2. 本地初始化：

```bash
mkdir ~/knowledge-base && cd ~/knowledge-base
git init
git remote add origin git@github.com:BlueWhalexh/knowledge-base.git
```

### 2. 推送现有 content/imported 内容到 knowledge-base

```bash
# 在博客 repo 目录下
cp -r content/imported/* ~/knowledge-base/
cd ~/knowledge-base
git add .
git commit -m "Initial import from blog content/imported"
git branch -M main
git push -u origin main
```

### 3. 在 knowledge-base repo 添加 dispatch workflow

在 `~/knowledge-base/.github/workflows/notify-blog.yml`：

```yaml
name: Notify Blog Repo
on:
  push:
    branches: [main]
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.BLOG_REPO_TOKEN }}
          repository: BlueWhalexh/MyBlog
          event-type: knowledge-base-updated
```

### 4. 配置 GitHub Secrets

#### MyBlog repo secrets

进入 `https://github.com/BlueWhalexh/MyBlog/settings/secrets/actions` 添加：

- **`DEPLOY_SSH_KEY`**：服务器部署 SSH 私钥
  - 在本地生成专用 key：`ssh-keygen -t ed25519 -f ~/.ssh/blog_deploy -C "github-actions-deploy"`
  - 把 `~/.ssh/blog_deploy.pub` 添加到服务器 `xuehang@146.190.97.62:~/.ssh/authorized_keys`
  - 把 `~/.ssh/blog_deploy`（私钥）整个粘贴进 secret
- **`KB_REPO_TOKEN`**：访问 knowledge-base 私有 repo 的 PAT
  - GitHub Settings → Developer settings → PAT (classic 或 fine-grained)
  - 权限：repo 读取（fine-grained 选 Contents: Read on knowledge-base repo）

#### knowledge-base repo secrets

进入 `https://github.com/BlueWhalexh/knowledge-base/settings/secrets/actions` 添加：

- **`BLOG_REPO_TOKEN`**：触发 MyBlog repository_dispatch 的 PAT
  - 权限：repo（fine-grained: Contents Write + Metadata Read on MyBlog repo）

### 5. 服务器侧确认

```bash
ssh xuehang@146.190.97.62
ls -la /opt/tech-blog/public/   # 确认目录存在并属 xuehang
# 如果不属 xuehang：sudo chown -R xuehang:xuehang /opt/tech-blog/public
```

### 6. 博客 repo 解除 content/imported 跟踪

⚠️ **不要把 `content/imported/` 加入 `.gitignore`** —— Quartz 用 globby 扫描内容时默认 `gitignore: true`，加了会让 build 直接跳过所有 imported 内容。

正确做法：解除跟踪即可，不加 .gitignore：

```bash
cd ~/path/to/MyBlog
git rm -r --cached content/imported
git commit -m "Untrack content/imported (now sourced from knowledge-base repo)"
git push
```

完成后，本地 `npm run pull-content` 会把 knowledge-base clone 进 `content/imported/`，该目录有自己的 `.git`，blog repo 会自动当作 nested repo 不去跟踪它。

---

## 日常工作流

### 写新文章

1. Obsidian 写入 `D:\Document\Notes\知识库\`
2. 同步到本地 knowledge-base 目录（修改 sync-config.json 让 destination 指向 knowledge-base 本地 clone，或用 rsync）
3. `cd ~/knowledge-base && git add . && git commit -m "..." && git push`
4. 自动触发：knowledge-base notify-blog → MyBlog deploy.yml → 服务器更新

### 改博客本身（样式、配置、scripts）

1. 在 MyBlog repo 修改
2. `git push origin main`
3. 自动触发 deploy.yml（push to main trigger）

### 本地预览（含知识库内容）

```bash
npm run pull-content   # 拉取 knowledge-base 到 content/imported/
npm run serve
```

### Fallback 手动部署

CI 故障时仍可用：

```powershell
.\scripts\deploy.ps1   # Windows
```

---

## 故障排查

### Actions 失败：`Permission denied (publickey)` 部署阶段

- 检查服务器 `~/.ssh/authorized_keys` 是否包含 `blog_deploy.pub`
- 检查 `DEPLOY_SSH_KEY` secret 是否完整（包含 BEGIN/END 行）

### Actions 失败：checkout knowledge-base 报 404

- 检查 `KB_REPO_TOKEN` 是否仍有效且权限包含 knowledge-base repo

### knowledge-base push 后博客没更新

- 检查 knowledge-base 的 Actions 标签页是否有 notify-blog 运行记录
- 检查 MyBlog 的 Actions 标签页是否收到 repository_dispatch
- `BLOG_REPO_TOKEN` 失效会让 dispatch 静默失败

### 中文路径 404

- 确认 rsync 完成且 sitemap.xml 包含该路径
- nginx + serve.mjs 的 URL decode 链路未变，与 V1 一致
