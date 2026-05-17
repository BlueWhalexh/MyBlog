---
tags: [八股文, JVM, 面试]
source: "[[todoList_detail#Day 29]]"
date: 2026-03-14
---

# JVM 优化策略

## 问题
JVM 有哪些常见的优化策略？

## 答案

| 优化方向 | 具体措施 |
|----------|----------|
| **使用G1** | `-XX:+UseG1GC`，适合大堆内存（>4GB） |
| **调整堆大小** | `-Xms`和`-Xmx`设为相同值，避免运行时扩缩容 |
| **减少对象创建** | 对象池、StringBuilder替代字符串拼接 |
| **减少Full GC** | 避免System.gc()，及时释放大对象引用 |
| **元空间调优** | `-XX:MaxMetaspaceSize`防止元空间溢出 |

## 相关笔记
- [[G1 GC 详细流程]]
- [[OOM 排查完整攻略]]
- [[频繁 GC 的原因分析]]

## 来源
原始记录：[[todoList_detail#Day 29 (03-14)]]
