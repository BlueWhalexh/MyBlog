---
tags: [学习, DevOps, Docker, 部署]
date: 2026-05-03
source: "[[待学清单]]"
---

# Docker 入门与核心概念

## 一、Docker 是什么

Docker 是一个**容器化平台**，把应用及其依赖打包成一个轻量级、可移植的容器，在任何地方运行。

| 对比维度 | 虚拟机 (VM) | Docker 容器 |
|---------|------------|------------|
| 启动速度 | 分钟级 | 秒级 |
| 资源占用 | 每个 VM 跑完整 OS（GB 级） | 共享宿主机内核（MB 级） |
| 隔离级别 | 硬件级（Hypervisor） | 进程级（Namespace + Cgroup） |
| 迁移性 | 笨重 | 镜像一次构建，到处运行 |

## 二、核心三要素

```
Dockerfile  ──build──▶  Image  ──run──▶  Container
  (蓝图)                 (模板)             (运行实例)
```

- **Dockerfile**：构建镜像的指令文件（`FROM`, `RUN`, `COPY`, `CMD` 等）
- **Image（镜像）**：分层存储的只读模板，每层对应 Dockerfile 中的一条指令
- **Container（容器）**：镜像的运行实例，在镜像层之上加一个可写层

## 三、常用命令速查

| 操作 | 命令 |
|------|------|
| 拉取镜像 | `docker pull nginx:latest` |
| 查看本地镜像 | `docker images` |
| 运行容器 | `docker run -d -p 8080:80 --name my-nginx nginx` |
| 查看运行中容器 | `docker ps` |
| 查看所有容器 | `docker ps -a` |
| 进入容器 | `docker exec -it my-nginx bash` |
| 查看日志 | `docker logs -f my-nginx` |
| 停止/启动/重启 | `docker stop/start/restart my-nginx` |
| 删除容器 | `docker rm my-nginx` |
| 删除镜像 | `docker rmi nginx:latest` |
| 构建镜像 | `docker build -t my-app:v1 .` |

## 四、Docker Compose（多服务编排）

解决"一个应用需要多个容器协同运行"的问题（比如 Web + MySQL + Redis）。

用 `docker-compose.yml` 声明所有服务，一条命令全部启动：

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root123
  redis:
    image: redis:7-alpine
```

```bash
docker-compose up -d    # 后台启动所有服务
docker-compose down     # 停止并删除所有服务
```

## 五、数据持久化

容器默认是无状态的，删除即丢数据。通过 **Volume** 持久化：

```bash
# 命名卷（推荐，Docker 管理）
docker run -v my-data:/var/lib/mysql mysql

# 绑定挂载（开发常用，直接映射宿主机目录）
docker run -v ./data:/var/lib/mysql mysql
```

## 六、推荐学习路线

1. 先看完 [Docker 官方 Get Started 系列](https://docs.docker.com/get-started/introduction/)（每模块 15 分钟）
2. 实操：把一个 Spring Boot 项目容器化
3. 学 Docker Compose：让 Web + MySQL + Redis 一起跑
4. 部署：参考 [[GitHub Actions Docker 部署流程]]

> 中文参考：[2025最全Docker入门到实战教程（腾讯云）](https://cloud.tencent.com.cn/developer/article/2621082)

## 相关链接

- [[GitHub Actions Docker 部署流程]] — 学完基础后看部署
- [[待学清单]] — 学习计划
