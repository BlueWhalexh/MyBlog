---
tags: [八股文, 场景题, 面试]
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# 存 IP 地址用什么数据类型比较好

## 问题
如果要存 IP 地址，用什么数据类型比较好？

## 面试考察点
- 数据类型理解：对 VARCHAR、INT UNSIGNED、VARBINARY、INET 等类型的特性掌握
- 性能意识：存储空间和查询效率的权衡
- 业务思维：根据场景（精确查找 vs 范围查询）选择方案
- 扩展视野：IPv4/IPv6 兼容、IP 归属地查询等高级需求

## 解题思路
> IPv4 推荐 INT UNSIGNED（4 字节），IPv6 推荐 BINARY(16)，PostgreSQL 用原生 INET 类型最优

IPv4 地址本质是 32 位无符号整数，用 VARCHAR(15) 存储需要 16 字节（含长度），而 INT UNSIGNED 仅需 4 字节，空间节省 75%。整数存储还便于范围查询（BETWEEN...AND），索引效率远高于字符串。MySQL 提供了 INET_ATON/INET_NTOA 函数做转换，Java 中可用位运算实现。

缺点是不便于阅读和需要手动转换。对于 IPv6，VARBINARY(16) 是最佳选择，MySQL 同样提供 INET6_ATON/INET6_NTOA。如果使用 PostgreSQL，原生 INET 类型既支持高效查询又支持 CIDR 包含判断，是最佳方案。实际 CDN 日志系统从 VARCHAR 改为 INT UNSIGNED 后，存储空间减少 65%，查询速度提升 5 倍。

## 具体方案
### 方案一：INT UNSIGNED（IPv4 推荐）
- 存储：仅 4 字节，空间最优
- 查询：整数比较最快，范围查询天然支持
- 转换：MySQL 用 `INET_ATON('192.168.0.1')` -> 3232235521
- 缺点：不直观，需在应用层或 SQL 层做转换

### 方案二：VARCHAR（简单场景）
- 存储：7-15 字节（IPv4），额外 1 字节长度
- 优点：直观可读，无需转换
- 缺点：索引效率低，范围查询性能差，比 INT 多占 60% 空间

### 方案三：VARBINARY(16)（IPv6 兼容）
- 存储：IPv4 4 字节，IPv6 16 字节
- 优点：统一格式兼容两种 IP 版本
- 缺点：可读性差，部分函数不支持

### 生产环境推荐设计
- MySQL：`ipv4 INT UNSIGNED` + `ipv6 BINARY(16)` 分离存储，各自建索引
- PostgreSQL：直接用 `INET` 类型，支持 `<<=` CIDR 包含查询
- IP 归属地查询：`start_ip INT UNSIGNED` + `end_ip INT UNSIGNED`，用 BETWEEN 查范围

## 要点总结
- IPv4 用 INT UNSIGNED（4 字节）是最佳选择，比 VARCHAR 节省 75% 空间
- MySQL 提供 INET_ATON/INET_NTOA 做字符串与整数互转
- IPv6 用 BINARY(16) 或 VARBINARY(16)，PostgreSQL 用原生 INET 类型
- IP 归属地场景用整数范围查询（BETWEEN start_ip AND end_ip）效率最高
- 存储空间优化直接影响索引大小和查询性能，不是可有可无的优化

## 相关笔记
- [[MySQL 索引失效的常见场景]]
- [[骚扰电话号码存储方案]]
- [[分库分表]]
- [[千万级数据查询优化]]

