---
tags: [八股文, Elasticsearch, 面试]
source: "[[todoList_detail#Day 39]]"
date: 2026-03-24
---

# ES 使用中的问题及解决方案

## 问题
Elasticsearch 在实际使用中有哪些常见问题？如何解决？

## 答案

| 问题 | 现象 | 解决方案 |
|------|------|---------|
| **脑裂** | 多个节点认为自己是 Master | `discovery.zen.minimum_master_nodes: n/2+1` |
| **分片不均衡** | 某些节点负载过高 | 手动 reroute，或开启自动均衡 |
| **内存溢出** | ES 进程被 OOM | 限制 JVM 堆内存（不超过 32G） |
| **查询慢** | 复杂查询耗时久 | 优化分片数量，使用 filter 缓存 |
| **写入瓶颈** | 写入速度跟不上 | 批量写入（bulk），调整 refresh_interval |

**面试回答**：
> "ES 使用中遇到过分片不均衡和查询慢的问题。分片不均衡通过手动 reroute 解决；查询慢通过优化分片数量（单分片不超过 30G）、使用 filter 缓存、以及预热热点数据解决。"

## 相关笔记
- [[ES 倒排索引详解]]
- [[深分页优化思路]]

## 来源
原始记录：[[todoList_detail#Day 39 (03-24)]]

