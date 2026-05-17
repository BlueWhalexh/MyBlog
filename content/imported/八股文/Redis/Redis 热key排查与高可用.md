---
tags: [八股文, Redis, 面试]
source: "[[todoList_detail#Day 30]]"
date: 2026-03-16
---

# Redis 热key排查与高可用

## 问题
如何排查 Redis 热 key 和大 key？Redis 的高可用方案有哪些？Redis Cluster 的原理是什么？

## 答案

### 热 key vs 大 key 对比

| 维度 | 大 key | 热 key |
|------|-------|-------|
| 定义 | 单个 key 的 value 很大 | 单个 key 访问频率极高 |
| 危害 | 阻塞、慢查询、迁移困难 | 单节点 CPU/带宽打满 |
| 排查 | `redis-cli --bigkeys` | 监控 QPS、`hotkeys` 参数 |
| 解决 | 拆分、压缩 | 本地缓存、key 分片 |

### 热 key 解决方案详解

1. **本地缓存（一级缓存）**
   - 使用 Caffeine 或 Guava Cache
   - 设置短过期时间（如 30 秒），减少 Redis 访问压力
   - 注意：数据一致性降低，适合读多写少场景

2. **key 分片（拆分）**
   ```
   原key: user:1001:profile
   拆分后: user:1001:profile:00 ~ user:1001:profile:99
   读取时: random(0,99) 或 hash(userId) % 100
   ```
   - 优点：分散压力到多个节点
   - 缺点：批量查询复杂度增加

3. **读写分离**
   - 从节点分担读压力
   - 注意：主从延迟可能导致读到旧数据

### 大 key 问题详解

#### 什么是大 key？

大 key 不是指 key 的名称很长，而是指 **value 的值很大**：

- **String 类型**：value 大于 10KB 就算大 key，大于 1MB 就是超大 key
- **集合类型（Hash/List/Set/ZSet）**：元素数量超过 1 万个，或者所有元素的总大小超过 10MB

#### 大 key 的危害

| 危害 | 说明 |
|------|------|
| **阻塞其他请求** | Redis 是单线程的，操作大 key 时会长时间占用主线程，导致其他请求阻塞 |
| **网络带宽打满** | 大 key 传输占用大量带宽，影响其他请求的响应时间 |
| **慢查询** | `GET`、`SET` 大 key 时耗时长，可能导致慢查询 |
| **内存不均衡** | 在 Redis Cluster 中，大 key 可能导致某些节点内存使用不均衡 |
| **数据迁移困难** | Redis Cluster 扩缩容时，迁移大 key 会阻塞迁移过程 |
| **过期/删除卡顿** | 删除大 key 时可能造成几毫秒甚至几秒的卡顿 |

#### 大 key 的排查方法

**1. `redis-cli --bigkeys`**
```bash
redis-cli --bigkeys
# 扫描整个 Redis，找出每种数据类型中最大的 key
# 优点：使用 SCAN 命令，不会阻塞 Redis
# 缺点：只能找到最大的 key，不能找到所有大 key
```

**2. `MEMORY USAGE` 命令**
```bash
MEMORY USAGE my_key
# 返回指定 key 占用的内存字节数
```

**3. `DEBUG OBJECT` 命令**
```bash
DEBUG OBJECT my_key
# 返回 key 的详细信息，包括序列化后的大小
```

**4. 使用 RDB 文件分析工具**
- 使用 `rdb-tools` 工具分析 RDB 文件
- 可以找出所有大 key，支持按大小排序

#### 大 key 的解决方案

**1. 拆分大 key**
```bash
# 大 Hash 拆分为多个小 Hash
HSET user:1001:info_0 name "Alice"
HSET user:1001:info_1 age 25
HSET user:1001:info_2 email "alice@example.com"

# 大 List 拆分为多个小 List
LPUSH msg_queue:0 msg1 msg2 msg3
LPUSH msg_queue:1 msg4 msg5 msg6
```

**2. 压缩 value**
- 使用 Snappy、Gzip 等压缩算法压缩 value
- 适用于 String 类型的大 key

**3. 使用 UNLINK 代替 DEL 删除大 key**

```bash
# 不推荐：DEL 是同步删除，会阻塞 Redis
DEL my_big_key

# 推荐：UNLINK 是异步删除，不会阻塞 Redis（Redis 4.0+）
UNLINK my_big_key
```

**DEL vs UNLINK 的区别**：
- `DEL`：同步删除，在主线程中执行。删除大 key 时会阻塞 Redis 几毫秒甚至几秒
- `UNLINK`：异步删除，主线程只做断开引用操作，真正的内存回收由后台线程完成，不阻塞主线程

**4. 渐进式删除**
```bash
# 对于大 Hash：使用 HSCAN + HDEL 逐批删除
HSCAN my_hash 0 COUNT 100
HDEL my_hash field1 field2 ...

# 对于大 Set：使用 SSCAN + SREM 逐批删除
# 对于大 ZSet：使用 ZSCAN + ZREM 逐批删除
```

### Redis 高可用方案

Redis 提供了三种高可用方案，从简单到复杂依次是：主从复制、哨兵模式、Redis Cluster。

#### 1. 主从复制（Master-Slave Replication）

**原理**：
- 一个 Master 节点可以有多个 Slave（从）节点
- Master 负责写操作，Slave 负责读操作（读写分离）
- Slave 从 Master 同步数据，保持数据一致

**复制方式**：
- **全量复制**：Slave 首次连接 Master 时，Master 将所有数据生成 RDB 文件发送给 Slave
- **增量复制**：全量复制后，Master 将新的写命令通过 repl_backlog 发送给 Slave

**缺点**：
- 不支持自动故障转移：Master 宕机后需要手动将 Slave 提升为 Master
- 不支持自动选主：需要人工介入

#### 2. 哨兵模式（Redis Sentinel）

**原理**：在主从复制的基础上，增加一组 Sentinel（哨兵）进程，负责监控 Redis 节点的运行状态，并在 Master 宕机时自动进行故障转移。

**Sentinel 的三大功能**：
1. **监控**：持续监控 Master 和 Slave 是否正常工作
2. **通知**：当某个 Redis 节点出现问题时，通知管理员或其他程序
3. **自动故障转移**：Master 宕机时，自动将 Slave 提升为新 Master

**Redis Sentinel 选举机制详解**：

1. **主观下线（Subjectively Down, SDOWN）**
   - 单个 Sentinel 认为主节点不可达
   - 通过 PING 命令检测，如果在 `down-after-milliseconds`（默认 30 秒）内无响应，则认为主观下线
   - 注意：主观下线不一定会触发故障转移

2. **客观下线（Objectively Down, ODOWN）**
   - Sentinel 向其他 Sentinel 询问该节点状态
   - 超过 `quorum` 数量的 Sentinel 同意，则确认客观下线
   - `quorum` 一般设置为 Sentinel 数量的一半 + 1

3. **选举 Leader Sentinel**
   - 使用 Raft 算法（分布式一致性算法）
   - 每个 Sentinel 向其他节点请求投票
   - 先到先得，获得多数票的 Sentinel 成为 Leader
   - Leader 负责执行故障转移

4. **选择新主节点**
   - 过滤：排除已下线、网络断开的从节点
   - 优先级：`slave-priority` 配置值小的优先（默认 100）
   - 复制偏移量：复制数据最多的优先（减少数据丢失）
   - Run ID：创建时间早的优先（保证确定性）

5. **故障转移执行**
   - Leader 向新主节点发送 `SLAVEOF NO ONE`
   - 向其他从节点发送 `SLAVEOF NEW_MASTER`
   - 更新配置，通知客户端（通过发布订阅）

**哨兵模式的缺点**：
- 不支持水平扩展（数据量受限于单个节点的内存）
- 写操作集中在 Master，无法分担写压力

#### 3. Redis Cluster

**原理**：Redis Cluster 是 Redis 官方提供的分布式集群方案，支持数据分片和高可用。

**核心概念**：

**1. 数据分片（16384 个 Slot）**
- Redis Cluster 将整个数据库划分为 **16384 个槽（Slot）**
- 每个 Master 节点负责一部分 Slot
- 每个 key 通过 `CRC16(key) % 16384` 计算属于哪个 Slot

```
节点A: Slot 0 ~ 5460
节点B: Slot 5461 ~ 10922
节点C: Slot 10923 ~ 16383
```

**2. 一致性哈希 vs 哈希槽**
- **一致性哈希**：将节点和数据映射到一个哈希环上，数据存储在顺时针方向的第一个节点。节点增减时只影响相邻节点的数据
- **哈希槽（Redis Cluster 使用）**：将数据映射到固定的 16384 个槽中，每个节点负责一部分槽。比一致性哈希更灵活，支持手动分配槽

**3. 节点通信：Gossip 协议**
- Redis Cluster 使用 Gossip 协议进行节点间通信
- 每个节点定期向其他节点发送 PING 消息
- 如果超时未收到 PONG 响应，则认为该节点可能下线（PFAIL）
- 超过半数 Master 节点都认为某节点 PFAIL，则标记为 FAIL

**Gossip 协议的消息类型**：
- **PING**：节点向其他节点发送心跳，携带自己知道的节点信息
- **PONG**：对 PING 的响应，也用于通知自己的状态变化
- **MEET**：通知新节点加入集群
- **FAIL**：通知某个节点已经下线

**Redis Cluster 的高可用**：
- 每个 Master 节点可以有多个 Slave 节点
- Master 宕机时，其 Slave 自动提升为新 Master
- 如果某个 Master 和它的所有 Slave 都宕机，该 Master 负责的 Slot 不可用

**4. 客户端重定向**
- 客户端发送命令到错误的节点时，节点返回 `MOVED` 重定向
- 客户端根据重定向信息，将请求发送到正确的节点
- 客户端会缓存 Slot 与节点的映射关系，减少重定向次数

#### 除了官方方案：Codis 和 Twemproxy

**Codis**（豌豆荚开源）：
- 基于代理的 Redis 集群方案
- 客户端连接 Codis Proxy，Proxy 将请求路由到后端 Redis 实例
- 支持数据分片、自动故障转移、在线扩缩容
- 优点：客户端无需修改，兼容单机 Redis 协议
- 缺点：增加了一层代理，有一定性能损耗

**Twemproxy**（Twitter 开源）：
- 也是基于代理的 Redis 集群方案
- 支持一致性哈希和哈希槽两种分片方式
- 优点：轻量级、配置简单
- 缺点：不支持在线扩缩容，扩缩容时需要重启

**对比**：

| 方案 | 分片 | 故障转移 | 在线扩缩容 | 性能 |
|------|------|---------|-----------|------|
| **Redis Cluster** | 哈希槽 | 自动 | 支持 | 高（直连） |
| **Codis** | 哈希槽 | 自动 | 支持 | 中（代理） |
| **Twemproxy** | 一致性哈希/哈希槽 | 不支持 | 不支持 | 中（代理） |

## 相关笔记
- [[Redis 单线程为什么这么快]]
- [[基于 Redis 的分布式锁]]
- [[Redis 缓存与 MySQL 数据一致性]]

## 来源
原始记录：[[todoList_detail#Day 30 (03-16)]]
