---
tags: [八股文, Redis, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Redis 主从同步原理

## 问题
Redis 主从复制的全量同步和增量同步流程是什么？如何优化主从同步？

## 答案

### 关键标识

- **Replication ID（replid）**：数据集标记。每个 master 节点有唯一的 replid，slave 节点继承 master 的 replid。通过 replid 判断是否为第一次同步
- **Offset（偏移量）**：记录在 repl_baklog 中的数据进度。slave 完成同步时记录当前 offset，offset 小于 master 说明数据落后

### 全量同步（首次连接）

**触发条件**：slave 首次连接 master，replid 不一致

**流程**：
1. slave 请求数据同步，携带自己的 replid 和 offset
2. master 判断 replid 不一致，确认是第一次同步
3. master 返回数据版本信息 replid 和 offset，slave 保存
4. master 执行 **bgsave**，生成 RDB 文件，同时将后续命令记录到 **repl_baklog**（内存缓冲区）
5. master 向 slave 发送 RDB 文件，slave **清空本地数据**，加载 RDB
6. master 向 slave 发送 repl_baklog 中的增量命令，slave 执行

### 增量同步（断线重连）

**触发条件**：slave 断连后恢复，replid 一致

**流程**：
1. slave 请求数据同步，携带自己的 replid 和 offset
2. master 判断 replid 一致，返回 continue
3. master 根据 slave 的 offset，只发送 repl_baklog 中**缺失的命令**

**特殊情况**：
- repl_baklog 是一个**环形数组**，大小有上限
- 如果 slave 断连时间过长，导致未同步的数据被覆盖，则无法增量同步，只能再次全量同步

### 实践优化

| 优化方向 | 具体措施 |
|---------|---------|
| **减少全量同步的磁盘IO** | 配置 `repl-diskless-sync yes` 启动无磁盘复制，RDB 数据直接通过网络传输，不写磁盘 |
| **控制单节点内存** | 减少全量同步时的磁盘IO和网络IO开销 |
| **减少全量同步概率** | 适当提高 repl_baklog 缓冲区大小，发现 slave 宕机时尽快恢复 |
| **减轻 master 同步压力** | 限制单个 master 的 slave 数量，采用**主-从-从**链式结构 |

### 主从数据不一致问题

**问题**：Redis 主从采用异步复制，slave 同步 master 数据存在延迟，在延迟窗口内读从节点可能读到旧数据。

**优化措施**：
- 监控主从复制延迟（`INFO replication` 中的 `master_repl_offset` 和 `slave_repl_offset`）
- 对实时性要求高的读操作，强制路由到主节点
- 合理配置网络环境，减少网络延迟

## 相关笔记
- [[Redis 热key排查与高可用]]

## 来源
来源：Java八股文PDF

