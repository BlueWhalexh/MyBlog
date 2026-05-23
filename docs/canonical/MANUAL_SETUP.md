# Manual Setup

V2 实施完成后需要用户手工配置的所有项目，按依赖关系排序。配完即可享受自动化发布 + 评论 + 统计。

---

## 总览（按优先级）

| # | 项目 | 必须？ | 预计耗时 |
|---|------|--------|----------|
| 1 | Mac 推送代理 + GitHub SSH key | ✅ 必须 | 10 min |
| 2 | knowledge-base repo + secrets | ✅ 必须（启用自动发布） | 30 min |
| 3 | 解除 blog repo 跟踪 content/imported | ✅ 必须 | 1 min |
| 4 | Giscus 评论 | ⚪ 可选 | 5 min |
| 5 | Umami 自托管统计 | ⚪ 可选 | 30 min |

---

## 1. Mac 推送代理 + GitHub SSH

### 1.1 走 iTerm2 代理

当前终端不在 iTerm2 进程下，没继承代理环境变量。配 git 走代理：

```bash
# 临时（当前会话）
export https_proxy=http://127.0.0.1:7890   # 替换为你的代理端口
export http_proxy=http://127.0.0.1:7890

# 永久（写到 ~/.zshrc）
echo 'export https_proxy=http://127.0.0.1:7890' >> ~/.zshrc
echo 'export http_proxy=http://127.0.0.1:7890' >> ~/.zshrc
```

或者直接给 git 单独配代理：

```bash
git config --global http.https://github.com.proxy http://127.0.0.1:7890
```

### 1.2 GitHub SSH key（推荐，免代理）

```bash
# 生成（如果没有）
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_github

# 加到 ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_github

# 复制公钥
cat ~/.ssh/id_ed25519_github.pub | pbcopy
```

到 https://github.com/settings/keys 添加 SSH key。

切换 remote 到 SSH：

```bash
cd /Users/didi/Documents/personal/MyBlog
git remote set-url origin git@github.com:BlueWhalexh/MyBlog.git
git push origin main
```

---

## 2. knowledge-base repo

详见 [KB_REPO_SETUP.md](KB_REPO_SETUP.md)。摘要：

1. GitHub 创建 `BlueWhalexh/knowledge-base`（推荐 private）
2. 推送当前 `content/imported/*` 内容到 knowledge-base
3. 在 knowledge-base 加 `.github/workflows/notify-blog.yml`（模板见 KB_REPO_SETUP.md）
4. 配置 secrets：

| Repo | Secret | 用途 |
|------|--------|------|
| BlueWhalexh/MyBlog | `DEPLOY_SSH_KEY` | rsync 部署到服务器（SSH 私钥） |
| BlueWhalexh/MyBlog | `KB_REPO_TOKEN` | checkout knowledge-base（PAT，repo 读权限） |
| BlueWhalexh/knowledge-base | `BLOG_REPO_TOKEN` | 触发 MyBlog dispatch（PAT，repo 写权限） |

5. 服务器 `~/.ssh/authorized_keys` 加入 `DEPLOY_SSH_KEY` 对应公钥
6. 服务器 `/opt/tech-blog/public/` 目录确认属 `xuehang` 用户

---

## 3. 解除 blog repo 跟踪 content/imported

knowledge-base 推送完成后：

```bash
cd /Users/didi/Documents/personal/MyBlog
git rm -r --cached content/imported
git commit -m "Untrack content/imported (sourced from knowledge-base)"
git push
```

⚠️ **不要** 把 `content/imported/` 加到 `.gitignore`——Quartz 用 globby 扫描时默认 `gitignore: true`，加了会让 build 直接跳过所有内容（实测 264 → 8 文件）。
本地 `pull-content.sh` clone 后该目录自带 `.git`，blog repo 自然不跟踪。

---

## 4. Giscus 评论（可选）

### 4.1 启用 GitHub Discussions

到 `https://github.com/BlueWhalexh/MyBlog/settings`，勾选 Features → Discussions。

### 4.2 安装 Giscus app

到 https://github.com/apps/giscus 安装到 MyBlog repo。

### 4.3 获取配置 ID

到 https://giscus.app，填写：
- Repository: `BlueWhalexh/MyBlog`
- Page ↔ Discussions 映射: pathname
- Discussion category: 创建一个新 category（推荐 type: Announcement）

页面会生成几个 ID，记下来：
- `data-repo-id`
- `data-category`
- `data-category-id`

### 4.4 配置 GitHub Actions secrets

到 `https://github.com/BlueWhalexh/MyBlog/settings/secrets/actions`，添加：

| Secret 名 | 值 |
|-----------|-----|
| `GISCUS_REPO` | `BlueWhalexh/MyBlog` |
| `GISCUS_REPO_ID` | giscus.app 给的 repo-id |
| `GISCUS_CATEGORY` | 你创建的 category 名（如 `Comments`） |
| `GISCUS_CATEGORY_ID` | giscus.app 给的 category-id |

`.github/workflows/deploy.yml` 已预注入这些 env 变量，secrets 配好下次 push 自动启用。

### 4.5 本地预览（带评论）

```bash
GISCUS_REPO_ID=xxx GISCUS_CATEGORY_ID=yyy npm run build
npm run serve
```

---

## 5. Umami 自托管统计（可选）

### 5.1 服务器部署 Umami

在服务器上（不抢占 3001 mypersonweb 端口）：

```bash
ssh xuehang@146.190.97.62
mkdir -p ~/umami && cd ~/umami
# 用 docker compose 部署，监听 3019（任选未占用端口）
# 参考 https://umami.is/docs/install
```

具体 docker-compose.yml 可参考 Umami 官方文档。配 nginx 反代到 `analytics.hjhxh.site` 或类似子域名。

### 5.2 创建 site，获取 Website ID

Umami 后台 → 添加 website → 复制 Website ID。

### 5.3 配置 GitHub Actions secrets

| Secret 名 | 值 |
|-----------|-----|
| `UMAMI_WEBSITE_ID` | Umami 给的 website ID |
| `UMAMI_HOST` | 例如 `https://analytics.hjhxh.site` |

### 5.4 完成

`.github/workflows/deploy.yml` 已经预先注入这些 env 变量，secrets 配好后下次 push 自动启用。

---

## 验证清单

完成上述步骤后逐项确认：

- [ ] `git push origin main` 不再走 HTTPS 报错
- [ ] knowledge-base push 后 3-5 分钟内 hjhxh.site 内容更新
- [ ] 文章页底部出现 Giscus 评论框（如启用）
- [ ] 浏览器 DevTools 看到 `<script async defer src="...umami..."></script>`（如启用）
- [ ] Umami 后台显示访问数据（如启用）
- [ ] Fallback：`scripts/deploy.ps1` 仍可手动用
