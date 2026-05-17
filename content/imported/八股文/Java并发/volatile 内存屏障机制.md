---
tags: [八股文, Java并发, 面试]
source: "[[todoList_detail#Day 30]]"
date: 2026-03-16
---

# volatile 内存屏障机制

## 问题
volatile 关键字的底层实现原理是什么？内存屏障如何工作？

## 答案

**内存屏障类型**：
| 屏障类型 | 作用 | 插入位置 |
|----------|------|----------|
| LoadLoad | 阻止读-读重排 | 读操作后 |
| StoreStore | 阻止写-写重排 | 写操作后 |
| LoadStore | 阻止读-写重排 | 读操作后 |
| StoreLoad | 阻止写-读重排（全能屏障） | 写操作后 |

**volatile实现原理**：
- **写操作**：在volatile写之后插入StoreStore屏障，确保之前的写都完成；插入StoreLoad屏障，确保之后的读写都在写完成后执行
- **读操作**：在volatile读之前插入LoadLoad屏障，确保之前的读都完成；插入LoadStore屏障，确保之后的写在读完成后执行

**注意点**：
- volatile保证可见性和有序性，但不保证原子性
- i++操作（读取-修改-写入）仍需synchronized或AtomicInteger

## 相关笔记
- [[Java 同步机制分层]]
- [[ThreadLocal 与 synchronized 作用及设计思想]]
- [[AQS 公平锁与非公平锁实现]]

## 来源
原始记录：[[todoList_detail#Day 30 (03-16)]]

