---
tags: [八股文, Java并发, 面试]
source: "[[todoList_detail#Day 39]]"
date: 2026-03-24
---

# Java 同步机制分层

## 问题
Java 的同步机制在哪些层面实现？Monitor 的内部结构是怎样的？

## 答案

| 层级 | 实现 | 说明 |
|------|------|------|
| **语言层面** | `synchronized` 关键字 | 语法糖 |
| **字节码层面** | `monitorenter` / `monitorexit` | 进入/退出临界区指令 |
| **JVM逻辑层面** | Monitor 监视器 | Owner + EntryList + WaitSet |
| **操作系统层面** | 用户态→内核态切换 | 申请 mutex 互斥量，重量级锁开销大 |

**Monitor 内部结构**：

- **Owner**：当前持有锁的线程
- **EntryList**：等待锁的阻塞线程队列
- **WaitSet**：调用 `obj.wait()` 后进入等待的线程队列

**加锁流程**：
1. 执行 `monitorenter` → JVM 检查 Monitor
2. Owner 为空 → 成为 Owner；被占用 → 进入 EntryList 阻塞
3. 执行 `monitorexit` → 释放锁，唤醒 EntryList 线程竞争

## 相关笔记
- [[ThreadLocal 与 synchronized 作用及设计思想]]
- [[悲观锁的实现机制]]
- [[AQS 公平锁与非公平锁实现]]

## 来源
原始记录：[[todoList_detail#Day 39 (03-24)]]

