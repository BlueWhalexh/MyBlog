---
tags: [八股文, Java并发, 面试]
date: 2026-04-30
---

# 原子类与 Unsafe 类

## 问题
什么是原子类？原子类的原理是什么？Unsafe 类是什么？为什么说它不安全？

## 答案

### 一、原子类是什么

原子类（Atomic Classes）是 `java.util.concurrent.atomic` 包下的一组类，它们提供了**线程安全的原子操作**，可以在不加锁的情况下实现多线程环境下的数据更新。

"原子"的含义是：**操作不可分割**。一个原子操作要么完全执行成功，要么完全不执行，不会出现执行到一半被其他线程打断的情况。

#### 1.1 原子类的分类

| 分类 | 类 | 说明 |
|------|-----|------|
| **基本类型原子类** | AtomicInteger | 原子操作 int 值 |
| | AtomicLong | 原子操作 long 值 |
| | AtomicBoolean | 原子操作 boolean 值 |
| **引用类型原子类** | AtomicReference | 原子操作对象引用 |
| | AtomicStampedReference | 带版本号的原子引用（解决 ABA 问题） |
| | AtomicMarkableReference | 带标记的原子引用 |
| **数组原子类** | AtomicIntegerArray | 原子操作 int 数组元素 |
| | AtomicLongArray | 原子操作 long 数组元素 |
| | AtomicReferenceArray | 原子操作引用数组元素 |
| **字段更新器** | AtomicIntegerFieldUpdater | 原子更新对象的 volatile int 字段 |
| | AtomicLongFieldUpdater | 原子更新对象的 volatile long 字段 |
| | AtomicReferenceFieldUpdater | 原子更新对象的 volatile 引用字段 |
| **累加器（JDK8+）** | LongAdder | 高并发下的高性能累加器 |
| | LongAccumulator | 通用的累加器 |
| | DoubleAdder | double 类型累加器 |
| | DoubleAccumulator | double 类型通用累加器 |

#### 1.2 基本使用示例

```java
// AtomicInteger 基本操作
AtomicInteger count = new AtomicInteger(0);

count.get();                // 获取当前值：0
count.set(10);              // 设置值为 10
count.getAndIncrement();    // 先获取再自增：返回 10，值变为 11
count.incrementAndGet();    // 先自增再获取：值变为 12，返回 12
count.getAndAdd(5);         // 先获取再加 5：返回 12，值变为 17
count.addAndGet(5);         // 先加 5 再获取：值变为 22，返回 22
count.getAndSet(100);       // 先获取再设置：返回 22，值变为 100
count.compareAndSet(100, 200); // CAS：如果当前值为 100，则更新为 200

// AtomicReference
AtomicReference<String> ref = new AtomicReference<>("hello");
ref.compareAndSet("hello", "world");  // CAS 更新引用
```

---

### 二、原子类的原理

#### 2.1 核心原理：CAS + volatile

原子类的底层实现依赖两个关键技术：

**1. volatile**

原子类内部的 value 字段用 `volatile` 修饰：

```java
// AtomicInteger 源码
private volatile int value;
```

volatile 保证了：
- **可见性**：一个线程修改了 value，其他线程立即可见。
- **有序性**：禁止指令重排序。

**2. CAS（Compare And Swap）**

原子类的所有修改操作都通过 CAS 来实现原子性：

```java
// AtomicInteger.getAndIncrement() 的实现
public final int getAndIncrement() {
    return unsafe.getAndAddInt(this, valueOffset, 1);
}

// Unsafe.getAndAddInt() 的实现（简化）
public final int getAndAddInt(Object obj, long offset, int delta) {
    int expected;
    do {
        expected = this.getIntVolatile(obj, offset);  // 读取当前值
    } while (!this.compareAndSwapInt(obj, offset, expected, expected + delta));  // CAS 重试
    return expected;
}
```

CAS 的执行过程：
1. 读取内存中的当前值（expected）。
2. 计算新值（expected + delta）。
3. 使用 CAS 尝试将内存中的值从 expected 更新为新值。
4. 如果成功，返回旧值。
5. 如果失败（说明被其他线程修改了），重新读取最新值并重试（自旋）。

#### 2.2 CAS 的问题

| 问题 | 说明 | 解决方案 |
|------|------|----------|
| **ABA 问题** | 值从 A→B→A，CAS 无法感知中间变化 | AtomicStampedReference（版本号） |
| **自旋开销** | 高竞争时 CAS 大量重试，浪费 CPU | LongAdder（分散热点） |
| **只能保证单变量原子性** | 无法同时对多个变量做原子操作 | 加锁 或 AtomicReference 封装 |

#### 2.3 LongAdder 的原理（JDK 8+）

在高并发场景下，AtomicLong 的 CAS 操作会因为竞争而大量自旋重试，性能下降。LongAdder 通过**分散热点**来解决这个问题。

**AtomicLong 的问题**：所有线程都竞争同一个 value，导致 CAS 频繁失败。

**LongAdder 的解决方案**：
- 内部维护一个 **base 值** 和一个 **Cell 数组**。
- 无竞争时直接 CAS 更新 base。
- 有竞争时，将不同的线程映射到不同的 Cell 上，每个 Cell 独立维护一个值。
- 最终结果 = base + 所有 Cell 的值之和。

```
AtomicLong:          LongAdder:
┌──────────┐         ┌──────────┐
│  value   │ ← 所有线程竞争  │   base   │ ← 无竞争时使用
└──────────┘         └──────────┘
                     ┌──────┬──────┬──────┬──────┐
                     │Cell0 │Cell1 │Cell2 │Cell3 │ ← 有竞争时分散
                     └──────┴──────┴──────┴──────┘
```

```java
// LongAdder 使用
LongAdder adder = new LongAdder();
adder.increment();       // 分散到不同的 Cell
adder.add(10);
long result = adder.sum();  // 汇总所有 Cell 的值
```

**适用场景**：统计计数、QPS 统计等高并发写多读少的场景。由于 sum() 不是原子操作（不是精确的实时值），不适合要求精确值的场景。

---

### 三、Unsafe 类

#### 3.1 Unsafe 是什么

`sun.misc.Unsafe` 是 JDK 内部的一个类，提供了**直接操作内存、线程调度、CAS 操作**等底层能力。它是 Java 中实现底层操作的"后门"。

之所以叫"Unsafe"，是因为它提供的方法**绕过了 Java 的安全机制**（如内存管理、类型安全、数组边界检查等），使用不当会导致 JVM 崩溃。

#### 3.2 获取 Unsafe 实例

Unsafe 是单例的，但它的 `getUnsafe()` 方法会检查调用者的类加载器，只有 Bootstrap ClassLoader 加载的类才能获取。通常需要通过反射来获取：

```java
// 获取 Unsafe 实例（反射方式）
Field f = Unsafe.class.getDeclaredField("theUnsafe");
f.setAccessible(true);
Unsafe unsafe = (Unsafe) f.get(null);
```

#### 3.3 Unsafe 的核心功能

**1. CAS 操作**

Unsafe 提供了最底层的 CAS 操作，是所有原子类和 AQS 的基础：

```java
// CAS 操作方法
public final native boolean compareAndSwapInt(Object obj, long offset, int expected, int newValue);
public final native boolean compareAndSwapLong(Object obj, long offset, long expected, long newValue);
public final native boolean compareAndSwapObject(Object obj, long offset, Object expected, Object newValue);
```

- `obj`：要操作的对象
- `offset`：字段在对象中的内存偏移量
- `expected`：期望的旧值
- `newValue`：要设置的新值
- 底层通过 CPU 的 `cmpxchg` 指令实现原子性

**2. 内存操作**

```java
// 分配堆外内存（不受 GC 管理）
long address = unsafe.allocateMemory(size);

// 设置内存值
unsafe.putByte(address, (byte) 1);
unsafe.putInt(address, 100);

// 读取内存值
byte b = unsafe.getByte(address);
int n = unsafe.getInt(address);

// 释放堆外内存
unsafe.freeMemory(address);

// 设置内存屏障
unsafe.loadFence();   // 读屏障
unsafe.storeFence();  // 写屏障
unsafe.fullFence();   // 全屏障
```

这些方法是 DirectByteBuffer（堆外内存/NIO）的底层实现基础。

**3. 对象操作**

```java
// 通过偏移量直接操作对象字段（绕过访问控制）
long offset = unsafe.objectFieldOffset(Field field);

// 直接读取对象字段值（包括 private 字段）
unsafe.getObject(obj, offset);
unsafe.putInt(obj, offset, value);

// 绕过构造函数创建对象（不会调用构造方法和初始化块）
MyClass obj = (MyClass) unsafe.allocateInstance(MyClass.class);
```

**4. 线程调度**

```java
// 线程挂起（类似 LockSupport.park）
unsafe.park(false, 0L);

// 线程恢复（类似 LockSupport.unpark）
unsafe.unpark(thread);

// 类加载
Class<?> clazz = unsafe.defineClass(name, bytes, 0, bytes.length, loader, protectionDomain);
```

**5. 数组操作**

```java
// 获取数组元素的偏移量
int baseOffset = unsafe.arrayBaseOffset(int[].class);
int scale = unsafe.arrayIndexScale(int[].class);

// 直接操作数组元素
unsafe.putInt(array, baseOffset + index * scale, value);
```

#### 3.4 为什么说 Unsafe 不安全

| 原因 | 说明 |
|------|------|
| **绕过内存管理** | 可以直接操作内存地址，可能导致内存泄漏（堆外内存需要手动释放） |
| **绕过类型安全** | 可以通过偏移量直接写入任意数据，破坏类型约束 |
| **绕过访问控制** | 可以读写 private 字段，破坏封装性 |
| **绕过 GC** | 操作堆外内存时不受 GC 管理，忘记释放会导致内存泄漏 |
| **绕过数组边界检查** | 直接通过偏移量访问数组，可能越界导致 JVM 崩溃 |
| **绕过构造函数** | allocateInstance 创建的对象可能处于不一致状态 |

#### 3.5 Unsafe 在 JDK 中的应用

| 使用场景 | 说明 |
|----------|------|
| **AtomicInteger 等原子类** | 通过 Unsafe 的 CAS 操作实现原子更新 |
| **AQS（AbstractQueuedSynchronizer）** | 通过 Unsafe 的 CAS 操作实现队列管理和状态变更 |
| **ConcurrentHashMap** | JDK7 中使用 Unsafe 的 CAS 操作实现分段锁 |
| **DirectByteBuffer** | NIO 的堆外内存分配和管理 |
| **LockSupport** | park/unpark 的底层实现 |
| **ClassValue** | 类级别变量的底层存储 |

#### 3.6 Unsafe 的替代方案

由于 Unsafe 是 JDK 内部 API，Java 9+ 引入了一些替代方案：

| Unsafe 方法 | 替代方案（JDK 9+） |
|-------------|-------------------|
| `compareAndSwapInt` | `VarHandle.compareAndSet()` |
| `getObject` / `putObject` | `VarHandle.get()` / `set()` |
| `park` / `unpark` | `LockSupport.park()` / `unpark()` |
| `allocateMemory` / `freeMemory` | `MemorySegment`（Foreign Function & Memory API） |

```java
// JDK 9+ VarHandle 替代 Unsafe CAS
class Counter {
    private volatile int count;
    
    private static final VarHandle COUNT;
    static {
        try {
            COUNT = MethodHandles.lookup()
                .findVarHandle(Counter.class, "count", int.class);
        } catch (Exception e) {
            throw new Error(e);
        }
    }
    
    public void increment() {
        int oldVal;
        do {
            oldVal = (int) COUNT.getVolatile(this);
        } while (!COUNT.compareAndSet(this, oldVal, oldVal + 1));
    }
}
```

### 四、原子类使用场景

| 场景 | 推荐类 | 说明 |
|------|--------|------|
| **简单计数器** | AtomicInteger / AtomicLong | 低竞争下的计数 |
| **高并发计数器** | LongAdder | 高竞争下的统计计数 |
| **序列号生成器** | AtomicLong | 全局唯一递增序列号 |
| **标志位** | AtomicBoolean | 线程安全的开关 |
| **无锁数据结构** | AtomicReference | 实现无锁栈/队列 |
| **解决 ABA 问题** | AtomicStampedReference | 需要版本号的场景 |
| **状态机** | AtomicInteger | 用 int 表示状态，CAS 转换 |
| **累积器** | LongAccumulator | 自定义累加规则 |

### 五、总结

| 维度 | 原子类 | Unsafe |
|------|--------|--------|
| **是什么** | 线程安全的原子操作类 | JDK 底层操作的"后门" |
| **实现原理** | CAS + volatile | 直接调用 CPU 原子指令 |
| **安全性** | 安全（封装良好） | 不安全（绕过 Java 安全机制） |
| **使用方式** | 直接使用 | 通常不直接使用 |
| **适用场景** | 简单的原子操作 | 框架/中间件底层实现 |

## 相关笔记
- [[CAS 与 JMM 内存模型]]
- [[乐观锁与悲观锁]]
- [[AQS 公平锁与非公平锁实现]]
- [[多线程上下文切换]]
