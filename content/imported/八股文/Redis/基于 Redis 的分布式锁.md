---
tags: [八股文, Redis, 面试]
source: "[[todoList_detail#Day 42]]"
date: 2026-03-31
---

# 基于 Redis 的分布式锁

## 问题
如何用 Redis 实现分布式锁？SetNx 实现的分布式锁有什么问题？Redisson 解决了哪些问题？Redisson 的 WatchDog 机制是什么？主从模式下锁丢失怎么解决？

## 答案

### 基于 SetNx 实现的分布式锁

最基础的分布式锁实现方式是使用 Redis 的 `SETNX`（SET if Not eXists）命令：

```bash
# 加锁（原子操作）
SET lock_key unique_value NX EX 30

# 释放锁（Lua 脚本保证原子性）
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

- `NX`：只有 key 不存在时才设置（互斥性）
- `EX 30`：设置 30 秒过期时间（防止死锁）
- `unique_value`：唯一标识（如 UUID + 线程 ID），防止误删其他线程的锁

### SetNx 实现的分布式锁存在什么问题？

#### 问题一：锁误删

**场景**：
1. 线程 A 获取锁，设置过期时间 30 秒
2. 线程 A 的业务执行时间超过 30 秒，锁自动过期释放
3. 线程 B 获取到锁，开始执行业务
4. 线程 A 执行完毕，执行 `DEL lock_key` 释放锁
5. 线程 A 误删了线程 B 的锁！

**解决方案**：释放锁时先判断锁的 value 是否是自己的标识，使用 Lua 脚本保证原子性：
```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

#### 问题二：不可重入

**场景**：线程 A 在方法 A 中获取了锁，方法 A 调用方法 B，方法 B 也需要获取同一把锁。如果锁不可重入，线程 A 在方法 B 中获取锁时会被阻塞，导致死锁。

**解决方案**：需要实现可重入锁，使用 Hash 结构记录重入次数。

#### 问题三：不可续期

**场景**：锁的过期时间是固定的（如 30 秒），如果业务执行时间超过了过期时间，锁会自动释放，其他线程可能获取到锁，导致并发问题。

**解决方案**：需要一个自动续期机制，在业务未完成时自动延长锁的过期时间。

#### 问题四：原子性问题

`SETNX` 和 `EXPIRE` 如果分两步执行，不是原子操作。如果 `SETNX` 成功后程序崩溃，没有执行 `EXPIRE`，锁将永远不过期（死锁）。

**解决方案**：使用 `SET key value NX EX seconds` 命令（Redis 2.6.12+），一步完成设置和过期。

### Redisson 分布式锁

Redisson 是一个 Java 的 Redis 客户端，提供了丰富的分布式锁实现，解决了上述所有问题。

#### Redisson 分布式锁的底层数据结构

Redisson 分布式锁使用 Redis 的 **Hash** 数据结构：

```
Key:   lock_name（锁的名称）
Field: clientUuid:threadId（客户端UUID:线程ID）
Value: 重入次数
```

**示例**：
```
HGETALL my_lock
1) "a]3b7c8d-e9f0-1234-5678-abcdef012345:1"
2) "1"
```

- Key `my_lock`：锁的名称
- Field `a]3b7c8d:1`：客户端唯一标识 + 线程 ID
- Value `1`：重入次数为 1

#### 可重入锁的实现原理

可重入锁使用 **state 计数器**（即 Hash 中的 value）记录重入次数：

**加锁流程**（Lua 脚本）：
```lua
-- 判断锁是否存在
if (redis.call('exists', KEYS[1]) == 0) then
    -- 不存在，直接加锁
    redis.call('hincrby', KEYS[1], ARGV[2], 1)
    redis.call('pexpire', KEYS[1], ARGV[1])
    return nil
end
-- 判断是否是当前线程持有的锁
if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then
    -- 是当前线程，重入次数 +1
    redis.call('hincrby', KEYS[1], ARGV[2], 1)
    redis.call('pexpire', KEYS[1], ARGV[1])
    return nil
end
-- 锁被其他线程持有，返回锁的剩余过期时间
return redis.call('pttl', KEYS[1])
```

**解锁流程**（Lua 脚本）：
```lua
-- 判断是否是当前线程持有的锁
if (redis.call('hexists', KEYS[1], ARGV[2]) == 0) then
    return nil
end
-- 重入次数 -1
local counter = redis.call('hincrby', KEYS[1], ARGV[2], -1)
if (counter > 0) then
    -- 还有重入，更新过期时间
    redis.call('pexpire', KEYS[1], ARGV[1])
    return 0
else
    -- 重入次数为 0，释放锁
    redis.call('del', KEYS[1])
    return 1
end
```

**重入过程示例**：
```
线程A第一次加锁: my_lock → {clientA:thread1 → 1}  (重入次数=1)
线程A第二次加锁: my_lock → {clientA:thread1 → 2}  (重入次数=2)
线程A第一次解锁: my_lock → {clientA:thread1 → 1}  (重入次数=1)
线程A第二次解锁: my_lock → {}  (锁被释放)
```

#### WatchDog 超时续约机制

**问题**：锁的过期时间怎么设置？设短了业务没执行完锁就过期了，设长了持有锁的线程宕机后其他线程要等很久。

**解决方案**：Redisson 的 WatchDog（看门狗）机制自动续期。

**WatchDog 的工作原理**：
1. 加锁时如果不指定 `leaseTime`（锁的持有时间），Redisson 会启动 WatchDog
2. WatchDog 是一个后台线程，默认每 **10 秒** 检查一次锁是否还被当前线程持有
3. 如果锁还在（业务还在执行），WatchDog 会将锁的过期时间续期到 **30 秒**（默认）
4. 如果锁已经被释放（业务执行完毕），WatchDog 停止续期
5. 如果持有锁的 JVM 实例宕机，WatchDog 随之停止，锁在 30 秒后自动过期释放

**关键配置**：
```java
Config config = new Config();
config.setLockWatchdogTimeout(30 * 1000); // 设置 watchdog 超时时间，默认 30 秒
```

**注意**：如果加锁时指定了 `leaseTime`（如 `lock.lock(10, TimeUnit.SECONDS)`），则不会启动 WatchDog，锁会在指定时间后自动释放。

#### Redisson 分布式锁的好处总结

| 特性 | 说明 |
|------|------|
| **原子性** | 底层使用 Lua 脚本，保证加锁和解锁的原子性 |
| **可重入** | 使用 Hash 结构和 state 计数器，同一线程可以多次获取同一把锁 |
| **自动续期** | WatchDog 机制自动续期，防止业务未执行完锁就过期 |
| **阻塞等待** | 支持 `lock()` 阻塞获取和 `tryLock()` 非阻塞获取 |
| **Pub/Sub 通知** | 锁释放时通过 Pub/Sub 机制通知等待的线程，避免轮询 |

### Redisson 分布式锁的问题：主从模式下锁丢失

#### 问题描述

在 Redis 主从架构下，Redisson 分布式锁可能出现**锁丢失**问题：

```
1. 客户端 A 在 Master 节点上成功加锁
2. Master 节点宕机，数据还未同步到 Slave 节点
3. Slave 节点被提升为新 Master
4. 客户端 B 在新 Master 上也成功加锁（因为新 Master 中没有客户端 A 的锁信息）
5. 两个客户端同时持有锁，互斥性被破坏！
```

#### 解决方案：RedLock（红锁）

RedLock 是 Redis 作者 Antirez 提出的分布式锁算法，用于解决主从模式下锁丢失问题。

**RedLock 的原理**：
1. 假设有 N 个独立的 Redis Master 节点（推荐 5 个，且互不关联）
2. 客户端依次向 N 个节点请求加锁，设置较短的超时时间
3. 如果在 **大多数节点（N/2 + 1）** 上加锁成功，且总耗时小于锁的过期时间，则认为加锁成功
4. 如果加锁失败（未达到大多数），则向所有节点发起解锁

**RedLock 示例**（5 个节点）：
```
节点1: 加锁成功 ✓
节点2: 加锁成功 ✓
节点3: 加锁成功 ✓
节点4: 加锁失败 ✗
节点5: 加锁失败 ✗
结果: 3/5 > 5/2+1，加锁成功
```

**RedLock 的争议**：
- Martin Kleppmann 在文章中指出 RedLock 存在时钟漂移、GC 暂停等问题
- 实际生产中，如果对一致性要求极高，建议使用 ZooKeeper 或 etcd 实现分布式锁
- 如果使用 Redis，单节点 + WatchDog 在大多数场景下已经够用

### 分布式锁方案对比

| 方案 | 实现 | 优点 | 缺点 |
|------|------|------|------|
| **Redis SetNx** | SETNX + EXPIRE | 简单，性能高 | 不可重入、不可续期、误删 |
| **Redisson** | Hash + Lua + WatchDog | 可重入、自动续期、阻塞等待 | 主从模式下锁丢失 |
| **RedLock** | 多节点 + 多数派 | 解决主从锁丢失 | 争议大、实现复杂 |
| **ZooKeeper** | 临时顺序节点 | 强一致性 | 性能较低、依赖 ZK 集群 |
| **etcd** | Lease + Revision | 强一致性 | 部署复杂 |

## 相关笔记
- [[Redis 单线程为什么这么快]]
- [[Redis 热key排查与高可用]]

## 来源
原始记录：[[todoList_detail#Day 42 (03-31)]]

