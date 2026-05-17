---
tags: [学习, DevOps, Docker, CI/CD, GitHub Actions, 部署]
date: 2026-05-03
source: "[[待学清单]]"
---

# GitHub Actions Docker 部署流程

## 一、整体流程

```
Git Push → GitHub Actions 触发
         → docker build + test
         → docker push 到镜像仓库（Docker Hub / GHCR）
         → SSH 到服务器
         → docker compose pull && up -d
         → 服务更新完成 ✅
```

## 二、关键组件

| 组件 | 作用 |
|------|------|
| **GitHub Actions** | CI/CD 引擎，代码 push 后自动触发 |
| **Docker Hub / GHCR** | 镜像仓库，存储构建好的镜像 |
| **appleboy/ssh-action** | GitHub Actions 中通过 SSH 远程执行命令 |
| **Docker Compose** | 服务器上管理多容器服务 |

## 三、GitHub Actions 工作流示例

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myname/myapp:latest

      - name: Deploy to server via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/myapp
            docker compose pull
            docker compose up -d --force-recreate
            docker image prune -f
```

## 四、必配的 GitHub Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：

| Secret 名 | 内容 |
|-----------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 |
| `DOCKER_TOKEN` | Docker Hub Access Token（不要用密码） |
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | SSH 用户名 |
| `SSH_PRIVATE_KEY` | SSH 私钥（`cat ~/.ssh/id_rsa`） |

## 五、生产环境增强

- **Nginx 反向代理 + SSL**：用 nginx-proxy + Let's Encrypt 自动管理证书
- **健康检查**：`docker compose` 中配置 `healthcheck`
- **回滚策略**：保留最近 N 个版本的镜像 tag，出问题手动切 tag
- **多阶段构建**：Dockerfile 中分离 build 和 runtime 阶段，减小镜像体积

## 六、推荐教程

| 教程 | 亮点 |
|------|------|
| [Dev.to: Complete CI/CD Pipeline](https://dev.to/roshan_singh_dd54d52bbaa7/-how-to-build-a-complete-cicd-pipeline-with-github-actions-and-docker-hub-1dda) | 多服务部署、零停机、磁盘清理 |
| [ServiceStack: SSH + Docker Compose 部署](https://docs.servicestack.net/ssh-github-action-deployment) | GitHub Container Registry + nginx + SSL 完整方案 |
| [FreeCodeCamp: 生产级 Pipeline](https://www.freecodecamp.org/news/build-a-production-ready-pipeline-with-docker-cicd-and-hostinger/) | React + Go + MongoDB 全栈示例 |

## 相关链接

- [[Docker 入门与核心概念]] — 先掌握 Docker 基础
- [[待学清单]] — 学习计划

