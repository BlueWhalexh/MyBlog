---
tags: [八股文, Java并发, 面试]
source: "[[todoList_detail#Day 42]]"
date: 2026-03-31
---

# AQS 如何实现公平锁和非公平锁

## 问题
AQS（抽象队列同步器）是什么？怎么实现的？核心设计思想是什么？如何实现公平锁和非公平锁？

## 答案

### 一、AQS 是什么

AQS 全称 **AbstractQueuedSynchronizer**（抽象队列同步器），是 `java.util.concurrent.locks` 包下的一个抽象类。它是 Java 并发包（JUC）的**基石**，许多同步工具都是基于 AQS 实现的：

| 基于 AQS 的同步工具 | 锁类型 |
|---------------------|--------|
| ReentrantLock | 独占锁（排他锁） |
| ReentrantReadWriteLock | 读锁（共享）+ 写锁（排他） |
| Semaphore | 共享锁 |
| CountDownLatch | 共享锁 |
| CyclicBarrier | 基于 Lock 实现（间接使用 AQS） |

### 二、AQS 的核心实现

AQS 的核心由三个部分组成：**volatile int state** + **CLH 双向队列** + **CAS 操作**。

#### 2.1 volatile int state（同步状态）

```java
private volatile int state;
```

- 用 `volatile` 修饰，保证线程间的**可见性**。
- 通过 `getState()`、`setState()`、`compareAndSetState()` 三个方法来操作。
- state 的含义取决于具体的同步器实现：

| 同步器 | state 含义 |
|--------|-----------|
| **ReentrantLock** | 0 表示锁空闲，>0 表示被占用（值为重入次数） |
| **ReentrantReadWriteLock** | 高 16 位表示读锁持有次数，低 16 位表示写锁重入次数 |
| **Semaphore** | 表示可用的许可数量 |
| **CountDownLatch** | 表示还需要 countDown() 的次数 |

#### 2.2 CLH 双向队列

AQS 内部维护了一个 **CLH（Craig, Landin, and Hagersten）变体的双向链表队列**，用于管理等待获取同步状态的线程。

**Node 节点结构**：

```java
static final class Node {
    // 等待状态
    volatile int waitStatus;
    // 前驱节点
    volatile Node prev;
    // 后继节点
    volatile Node next;
    // 持有的线程
    volatile Thread thread;
    // 条件队列中的下一个节点 或 共享模式标识
    Node nextWaiter;
}
```

**waitStatus 的取值**：

| 值 | 含义 |
|----|------|
| 0 | 初始状态 |
| SIGNAL (-1) | 当前节点的后继节点需要被唤醒（当前节点释放锁后需要唤醒后继） |
| CONDITION (-2) | 节点在条件队列中等待 |
| PROPAGATE (-3) | 共享模式下，操作需要向后传播 |
| CANCELLED (1) | 节点已取消（超时或中断导致） |

**队列结构**：

```
Head (虚节点/已获取锁的节点) ⇄ Node1 ⇄ Node2 ⇄ Node3 ⇄ ... ⇄ Tail
```

- **Head** 节点是虚节点（或已获取锁的节点），不持有线程。
- 新节点通过 CAS 加入队列尾部（`enq` 方法，自旋 + CAS 保证线程安全）。
- 已获取锁的节点（Head）释放锁时，唤醒后继节点。

#### 2.3 CAS 操作

AQS 依赖 **Unsafe 类的 CAS 操作**来实现无锁的状态变更和入队操作：

- `compareAndSetState(expect, update)`：CAS 修改 state。
- `compareAndSetTail(expect, update)`：CAS 将新节点加入队尾。
- `compareAndSetHead(node)`：CAS 设置头节点。

### 三、AQS 的核心设计思想——模板方法模式

AQS 采用了**模板方法模式**（Template Method Pattern），将同步器的实现分为两层：

1. **AQS 框架层**（不可变）：定义了获取和释放同步状态的整体流程（模板方法），包括入队、出队、阻塞、唤醒等。
2. **子类实现层**（可变）：子类只需重写以下几个**钩子方法**（Hook Method）来定义"如何获取/释放同步状态"：

| 方法 | 说明 |
|------|------|
| `tryAcquire(int arg)` | 独占模式下尝试获取同步状态，返回 true/false |
| `tryRelease(int arg)` | 独占模式下尝试释放同步状态，返回 true/false |
| `tryAcquireShared(int arg)` | 共享模式下尝试获取同步状态，返回负数(失败)/0(成功但无剩余)/正数(成功且有剩余) |
| `tryReleaseShared(int arg)` | 共享模式下尝试释放同步状态 |
| `isHeldExclusively()` | 当前线程是否独占持有同步状态 |

**模板方法（框架层提供的）**：

| 方法 | 说明 |
|------|------|
| `acquire(int arg)` | 独占获取（调用 tryAcquire，失败则入队阻塞） |
| `acquireInterruptibly(int arg)` | 可中断的独占获取 |
| `tryAcquireNanos(int arg, long nanos)` | 超时的独占获取 |
| `acquireShared(int arg)` | 共享获取 |
| `release(int arg)` | 独占释放（调用 tryRelease，成功则唤醒后继） |
| `releaseShared(int arg)` | 共享释放 |

**设计优势**：
- 子类只需关注"如何获取/释放状态"的业务逻辑，不需要关心队列管理、线程阻塞/唤醒等底层细节。
- 代码复用，框架层的排队、阻塞、唤醒逻辑只写一次。
- 扩展性好，通过重写不同的钩子方法可以实现不同类型的同步器。

### 四、独占锁获取流程（acquire）

```java
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&              // 1. 尝试获取锁（子类实现）
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))  // 2. 获取失败则入队并阻塞
        selfInterrupt();                  // 3. 如果阻塞期间被中断，恢复中断状态
}
```

**详细流程**：
1. 调用 `tryAcquire(arg)` 尝试获取锁（CAS 修改 state）。
2. 如果获取成功，直接返回。
3. 如果获取失败，调用 `addWaiter(Node.EXCLUSIVE)` 将当前线程封装为 Node 加入 CLH 队列尾部（CAS + 自旋）。
4. 调用 `acquireQueued`，在队列中自旋：
   - 检查前驱节点是否是 Head，如果是则再次尝试 `tryAcquire`。
   - 如果不是 Head 或获取失败，则调用 `parkAndCheckInterrupt()` 挂起当前线程（`LockSupport.park`）。
5. 当前驱节点释放锁时，会唤醒后继节点（`LockSupport.unpark`），被唤醒的线程继续尝试获取锁。

### 五、独占锁释放流程（release）

```java
public final boolean release(int arg) {
    if (tryRelease(arg)) {       // 1. 尝试释放锁（子类实现）
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);  // 2. 唤醒后继节点
        return true;
    }
    return false;
}
```

### 六、公平锁与非公平锁的实现

AQS 本身不区分公平和非公平，它只提供了队列管理的框架。**公平与非公平的区别在于 tryAcquire 的实现**。

以 ReentrantLock 为例：

#### 6.1 非公平锁（NonfairSync，默认）

```java
// NonfairSync.tryAcquire
final boolean nonfairTryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 关键区别：直接尝试 CAS 获取锁，不管队列中有没有等待的线程
        if (compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    // 可重入逻辑
    else if (current == getExclusiveOwnerThread()) {
        setState(c + acquires);
        return true;
    }
    return false;
}
```

#### 6.2 公平锁（FairSync）

```java
// FairSync.tryAcquire
protected final boolean tryAcquire(int acquires) {
    final Thread current = Thread.currentThread();
    int c = getState();
    if (c == 0) {
        // 关键区别：先检查队列中有没有等待更久的线程
        if (!hasQueuedPredecessors() &&   // 检查是否有前驱节点在等待
            compareAndSetState(0, acquires)) {
            setExclusiveOwnerThread(current);
            return true;
        }
    }
    // 可重入逻辑
    else if (current == getExclusiveOwnerThread()) {
        setState(c + acquires);
        return true;
    }
    return false;
}
```

#### 6.3 核心区别对比

| 维度 | 非公平锁 | 公平锁 |
|------|----------|--------|
| **tryAcquire 逻辑** | 直接 CAS 抢锁 | 先检查 `hasQueuedPredecessors()` |
| **新线程行为** | 插队尝试，失败后才入队 | 必须检查队列，有等待者则入队 |
| **吞吐量** | 高（减少线程切换） | 低（严格的 FIFO 顺序） |
| **饥饿问题** | 可能（某些线程长期获取不到锁） | 不会 |
| **默认行为** | ReentrantLock 默认 | 需要显式指定 `new ReentrantLock(true)` |

#### 6.4 为什么非公平锁性能更好

1. **减少线程切换**：新来的线程如果恰好在锁释放的瞬间到达，可以直接获取锁，避免了唤醒队列中线程的开销（唤醒涉及内核态切换）。
2. **CPU 缓存友好**：刚获取到 CPU 时间片的线程直接获取锁，数据还在缓存中。
3. **大部分情况下等待时间很短**：在实际应用中，锁的持有时间通常很短，新线程直接获取成功的概率较高。

### 七、共享锁与排他锁的区别

| 维度 | 排他锁（独占锁） | 共享锁 |
|------|------------------|--------|
| state 含义 | 0=空闲，>0=被占用（值为重入次数） | 可用资源数 |
| 获取 | tryAcquire，state 从 0→1 | tryAcquireShared，state-- |
| 释放 | tryRelease，state 减至 0 才真正释放 | tryReleaseShared，state++ |
| 并发性 | 同一时刻只有一个线程持有 | 多个线程可同时持有 |
| 代表 | ReentrantLock | Semaphore、ReadWriteLock 的读锁 |

## 相关笔记
- [[悲观锁的实现机制]]
- [[线程池工作原理]]
- [[Java 同步机制分层]]
- [[CAS 与 JMM 内存模型]]

## 来源
原始记录：[[todoList_detail#Day 42 (03-31)]]

