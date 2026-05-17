---
tags: [八股文, 场景题, 面试]
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# Redis缓存库存防淘汰策略

## 问题
Redis保存库存的时候，如何避免被Redis清理掉？

## 面试考察点
- Redis内存淘汰机制原理（maxmemory-policy）
- 不同淘汰策略的行为差异与适用场景
- 库存数据的持久化与容灾能力
- 淘汰策略配置不当导致库存被错误驱逐的反模式

## 解题思路
> 核心问题：Redis内存不足时会根据淘汰策略删除键，如果策略配置不当或库存键未设置过期时间，可能导致库存数据被误删，引发超卖。

库存被误删的原因：使用了allkeys-lru/allkeys-random策略会删除任何键；使用volatile-lru/volatile-ttl策略但库存键未设置TTL；内存不足时即使永不过期的键也可能被清理。

解决方案按优先级：选择合适淘汰策略（推荐volatile-lru或noeviction）-> 合理设置TTL -> 使用PERSIST命令去除过期时间 -> 合理规划内存容量 -> 内存隔离（独立Redis实例）-> 监控内存使用。

## 具体方案
### 方案一：noeviction + PERSIST
- 原理：禁止自动驱逐，库存键使用PERSIST去除过期时间永不过期
- 配置：`maxmemory-policy noeviction`
- 适用：核心库存数据必须持久化，Redis内存足够
- 风险：内存溢出时服务不可用，需配合内存监控

### 方案二：volatile-lru + 合理TTL
- 原理：仅清理有过期时间的键，库存键设置合理TTL
- 配置：`maxmemory-policy volatile-lru`，`SET stock:1001 100 EX 86400`
- 适用：库存数据可接受定期刷新

### 方案三：混合持久化 + 数据校验
- 原理：AOF+RDB混合持久化保障数据不丢失，定时校验Redis与MySQL库存一致性
- 配置：`aof-use-rdb-preamble yes` + `appendfsync everysec`
- 校验：定时任务对比Redis和MySQL库存，不一致时告警

## 要点总结
- 核心库存推荐noeviction策略，内存溢出时拒绝写入而非删除数据
- 不推荐allkeys-lru用于库存场景，可能误删低频但重要的库存键
- 库存键需长期保留时使用PERSIST去除过期时间
- 启用混合持久化（Redis 4.0+）保障数据不丢失，重启后快速恢复
- 使用独立Redis实例存储库存数据，避免与其他缓存数据混用导致被淘汰

## 相关笔记
- [[Redis 内存淘汰策略]]
- [[Redis 持久化机制 RDB 与 AOF]]
- [[秒杀库存扣减方案]]

