---
tags: [八股文, Java并发, 面试]
source: "[[todoList_detail#Day 42]]"
date: 2026-03-31
---

# ThreadLocal 和 synchronized 的作用及设计思想？

## 问题
ThreadLocal 和 synchronized 分别解决什么问题？它们的设计思想有何不同？

## 答案

ThreadLocal 是为了获得线程独立副本。线程之间共享堆内存，但有时候需要线程私有的变量（比如用户上下文、数据库连接）。底层是每个 Thread 维护一个 ThreadLocalMap，Key 是 ThreadLocal 对象（弱引用），Value 是值。内存泄漏问题：Key 被回收后 Value 还在，用完必须手动 remove()。

synchronized 是实现悲观锁的关键。底层是 JVM 内置的 Monitor 监视器锁，每个对象都有一个 Monitor。Monitor 里维护了 Owner（当前持有锁的线程）、EntryList（等待锁的线程队列）、WaitSet（调用了 wait() 的线程队列）。锁升级过程：无锁 → 偏向锁（单线程重入）→ 轻量级锁（CAS 自旋）→ 重量级锁（阻塞等待）。

## 相关笔记
- [[ThreadLocal 底层原理与内存泄漏]]
- [[Java 同步机制分层]]
- [[悲观锁的实现机制]]

## 来源
原始记录：[[todoList_detail#Day 42 (03-31)]]

