---
tags: [八股文, 场景题, 面试]
source: "Java面试准备"
date: 2026-04-30
---

# Redis 挂了怎么办

## 问题

线上 Redis 出现故障（宕机/网络不通/响应超时），系统应该如何应对？

## 一、故障类型

| 故障类型 | 表现 | 影响 |
|----------|------|------|
| 单节点宕机 | 某个 Redis 实例不可用 | 部分数据不可访问 |
| 主从切换 | 主节点故障，从节点提升为主 | 短暂不可写（秒级） |
| 网络分区 | 集群节点间网络不通 | 脑裂，数据不一致 |
| 整个集群不可用 | 所有 Redis 节点不可用 | 缓存层完全失效 |
| 响应变慢 | Redis 响应时间飙升 | 线程阻塞，服务变慢 |

---

## 二、预防措施：高可用架构

### 2.1 哨兵模式（Sentinel）

**架构**：

```
Sentinel 1 ─┐
Sentinel 2 ─┤── 监控 ──→ Redis Master ←───→ Redis Slave 1
Sentinel 3 ─┘                                  Redis Slave 2
```

**原理**：

1. 多个 Sentinel 进程监控 Redis 主从节点
2. 主节点宕机时，Sentinel 自动将从节点提升为主节点
3. 客户端通过 Sentinel 获取当前主节点地址

**故障转移过程**：

```
1. Sentinel 检测到主节点主观下线（SDOWN）
2. 多个 Sentinel 确认客观下线（ODOWN）
3. Sentinel 选举 Leader
4. Leader 选择最优从节点提升为主
5. 通知其他从节点切换主节点
6. 通知客户端新主节点地址
```

**Java 配置**：

```java
@Bean
public RedisConnectionFactory redisConnectionFactory() {
    RedisSentinelConfiguration config = new RedisSentinelConfiguration()
        .master("mymaster")
        .sentinel("sentinel1", 26379)
        .sentinel("sentinel2", 26379)
        .sentinel("sentinel3", 26379);
    
    LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
    return factory;
}
```

**缺点**：无法水平扩展，单个主节点的写能力有限。

### 2.2 Cluster 集群模式

**架构**：

```
Node1(Master) ←──→ Node2(Master) ←──→ Node3(Master)
     ↕                  ↕                  ↕
Node4(Slave)       Node5(Slave)       Node6(Slave)
```

**原理**：

1. 数据分片：16384 个槽位分配到多个主节点
2. 每个主节点负责一部分槽位
3. 每个主节点有从节点做备份
4. 主节点故障时，从节点自动接管

**Java 配置**：

```java
@Bean
public RedisConnectionFactory redisConnectionFactory() {
    RedisClusterConfiguration config = new RedisClusterConfiguration();
    config.addClusterNode(new RedisNode("node1", 6379));
    config.addClusterNode(new RedisNode("node2", 6379));
    config.addClusterNode(new RedisNode("node3", 6379));
    config.setMaxRedirects(3);
    
    return new LettuceConnectionFactory(config);
}
```

**优点**：支持水平扩展，数据自动分片。

### 2.3 哨兵 vs 集群

| 特性 | 哨兵 | 集群 |
|------|------|------|
| 数据分片 | 不支持 | 支持 |
| 水平扩展 | 不支持 | 支持 |
| 高可用 | 支持 | 支持 |
| 复杂度 | 低 | 高 |
| 适用场景 | 数据量 < 16GB | 数据量大、高并发 |

---

## 三、故障时的降级方案

### 3.1 本地缓存兜底

当 Redis 不可用时，使用本地缓存提供服务。

```java
@Component
public class ResilientCacheService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    // 本地缓存作为兜底
    private final Cache<String, Object> localCache = Caffeine.newBuilder()
        .maximumSize(10000)
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build();
    
    public Object get(String key) {
        // 1. 尝试从 Redis 获取
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                // 同步到本地缓存
                localCache.put(key, value);
                return value;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable, falling back to local cache", e);
        }
        
        // 2. Redis 不可用或未命中，从本地缓存获取
        return localCache.getIfPresent(key);
    }
    
    public void put(String key, Object value, long ttl) {
        // 写入 Redis
        try {
            redisTemplate.opsForValue().set(key, value, ttl, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis write failed", e);
        }
        // 同时写入本地缓存
        localCache.put(key, value);
    }
}
```

### 3.2 直接查库

缓存全部不可用时，降级为直接查数据库。

```java
public UserDTO getUser(long userId) {
    String cacheKey = "user:" + userId;
    
    // 1. 尝试缓存
    try {
        UserDTO cached = cacheService.get(cacheKey);
        if (cached != null) return cached;
    } catch (Exception e) {
        log.warn("Cache unavailable", e);
    }
    
    // 2. 查数据库
    UserDTO user = userMapper.selectById(userId);
    
    // 3. 尝试回写缓存（尽力而为）
    if (user != null) {
        try {
            cacheService.put(cacheKey, user, 300);
        } catch (Exception ignored) {}
    }
    
    return user;
}
```

**注意**：直接查库时需要做好限流，防止大量请求打垮数据库。

### 3.3 限流保护数据库

```java
// 使用 Sentinel 或 Guava RateLimiter 限流
private final RateLimiter rateLimiter = RateLimiter.create(1000); // 1000 QPS

public UserDTO getUserWithRateLimit(long userId) {
    if (!rateLimiter.tryAcquire(100, TimeUnit.MILLISECONDS)) {
        throw new RuntimeException("系统繁忙，请稍后重试");
    }
    return userMapper.selectById(userId);
}
```

### 3.4 返回默认值/静态数据

对于非核心数据，直接返回默认值或静态数据。

```java
public ConfigDTO getConfig(String key) {
    try {
        return cacheService.get("config:" + key);
    } catch (Exception e) {
        // 返回本地配置文件中的默认值
        return defaultConfig.get(key);
    }
}
```

---

## 四、故障检测与告警

### 4.1 健康检查

```java
@Component
public class RedisHealthIndicator implements HealthIndicator {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Override
    public Health health() {
        try {
            long start = System.currentTimeMillis();
            String pong = redisTemplate.getConnectionFactory()
                .getConnection().ping();
            long rt = System.currentTimeMillis() - start;
            
            if (rt > 100) {
                return Health.down()
                    .withDetail("message", "Redis 响应过慢")
                    .withDetail("rt", rt + "ms")
                    .build();
            }
            
            return Health.up()
                .withDetail("message", "Redis 正常")
                .withDetail("rt", rt + "ms")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("message", "Redis 不可用")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### 4.2 告警规则

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| Redis 连接失败 | > 0 | P0（紧急） |
| Redis 响应时间 | > 100ms | P1（严重） |
| Redis 内存使用率 | > 80% | P2（警告） |
| Redis 连接池使用率 | > 80% | P2（警告） |
| 主从切换 | 发生 | P1（严重） |
| 慢查询数量 | > 10/min | P2（警告） |

---

## 五、故障恢复

### 5.1 自动恢复

哨兵和集群模式都支持自动故障转移。恢复过程：

```
1. 故障节点恢复后自动加入集群
2. 作为从节点同步主节点数据
3. 数据同步完成后可参与读请求
```

### 5.2 手动恢复

```bash
# 检查节点状态
redis-cli -h host -p port info replication

# 手动触发故障转移
redis-cli -h sentinel-host -p 26379 sentinel failover mymaster

# 检查集群状态
redis-cli -h host -p port cluster info
redis-cli -h host -p port cluster nodes
```

### 5.3 数据恢复

如果 Redis 数据丢失，需要从持久化文件恢复：

```bash
# 从 RDB 文件恢复
cp dump.rdb /var/lib/redis/
redis-cli shutdown nosave
redis-server /etc/redis/redis.conf

# 从 AOF 文件恢复
cp appendonly.aof /var/lib/redis/
redis-cli shutdown nosave
redis-server /etc/redis/redis.conf
```

---

## 六、最佳实践总结

### 预防

1. 使用哨兵或集群模式保证高可用
2. 合理配置持久化（RDB + AOF）
3. 设置合理的 maxmemory 和淘汰策略
4. 使用连接池管理连接

### 检测

1. 接入 Prometheus + Grafana 监控 Redis 指标
2. 配置告警规则，及时发现问题
3. 定期进行故障演练（混沌工程）

### 降级

1. 本地缓存作为第一道防线
2. 限流保护数据库作为第二道防线
3. 返回默认值/静态数据作为最后手段

### 恢复

1. 自动故障转移（哨兵/集群）
2. 定时对账，修复数据不一致
3. 完善的备份恢复方案

## 常见追问

### Q：Redis 集群脑裂怎么办？

> 脑裂指集群因网络分区出现多个主节点同时写入。
> 1. 配置 `min-replicas-to-write`：主节点至少有 N 个从节点连接才能写入
> 2. 配置 `min-replicas-max-lag`：从节点延迟不超过 N 秒
> 3. 使用 Redis 6.0+ 的多线程 IO，减少网络延迟

### Q：Redis 响应变慢怎么排查？

> 1. 使用 `SLOWLOG GET` 查看慢查询
> 2. 使用 `INFO memory` 查看内存使用
> 3. 使用 `INFO stats` 查看 QPS 和命中率
> 4. 检查是否有大 Key（`redis-cli --bigkeys`）
> 5. 检查是否在进行持久化（fork 子进程导致阻塞）
> 6. 检查网络延迟和带宽

### Q：缓存和数据库双写不一致如何处理？

> 参考 [[Redis 缓存与 MySQL 数据一致性]]。核心方案：
> 1. 先更新数据库，再删除缓存（Cache Aside Pattern）
> 2. 延迟双删：删除缓存 → 更新数据库 → 延迟 N 毫秒 → 再次删除缓存
> 3. 通过 Binlog + Canal 异步更新缓存

## 相关笔记
- [[Redis 持久化机制 RDB 与 AOF]]
- [[Redis 主从同步原理]]
- [[Redis 热key排查与高可用]]
- [[Redis 缓存与 MySQL 数据一致性]]
- [[缓存穿透击穿与雪崩]]
