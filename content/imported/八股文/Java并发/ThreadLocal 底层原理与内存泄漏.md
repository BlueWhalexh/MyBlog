---
tags: [八股文, Java并发, 面试]
source: "[[todoList_detail#Day 39]]"
date: 2026-03-24
---

# ThreadLocal 底层原理与内存泄漏

## 问题
ThreadLocal 的底层存储结构是什么？内存泄漏是如何产生的？

## 答案

**存储结构**：
- 每个 Thread 维护一个 `ThreadLocalMap`
- 底层是 Entry 数组（线性探测法解决哈希冲突）
- Key：ThreadLocal 对象（弱引用）
- Value：实际存储的值（强引用）

**内存泄漏场景**：
| 场景 | 是否泄漏 | 原因 |
|------|----------|------|
| 单线程 | ❌ 不会 | 线程销毁，ThreadLocal 和 Map 引用断开，GC 回收 |
| 线程池 | ⚠️ 会 | 线程复用不销毁，Value 强引用无法回收，导致内存泄漏 |

**解决方案**：`threadLocal.remove()` 必须在使用后调用

## 相关笔记
- [[ThreadLocal 与 synchronized 作用及设计思想]]
- [[Java 同步机制分层]]

## 来源
原始记录：[[todoList_detail#Day 39 (03-24)]]
