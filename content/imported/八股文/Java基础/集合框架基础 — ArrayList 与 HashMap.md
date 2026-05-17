---
tags: [八股文, Java基础, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# 集合框架基础 — ArrayList 与 HashMap

## 问题
集合的分类有哪些？ArrayList 和 HashMap 的底层实现原理是什么？扩容机制？线程安全问题如何解决？ConcurrentHashMap 的实现原理？

## 答案

### 集合的分类

Java 集合框架主要分为两大体系：

**1. Collection 单列集合体系（存储单个元素）**

```
Collection (接口)
├── List (接口) — 有序、可重复
│   ├── ArrayList    — 数组实现，查询快，增删慢
│   ├── LinkedList   — 双向链表实现，增删快，查询慢
│   └── Vector       — 数组实现，线程安全（已过时）
├── Set (接口) — 无序、不可重复
│   ├── HashSet      — 基于 HashMap 实现
│   ├── LinkedHashSet— 维护插入顺序
│   └── TreeSet      — 红黑树实现，有序
└── Queue (接口) — 队列
    ├── LinkedList   — 双端队列
    ├── PriorityQueue— 优先级队列（堆）
    └── ArrayDeque   — 循环数组实现的双端队列
```

**2. Map 双列集合体系（存储键值对）**

```
Map (接口)
├── HashMap        — 数组+链表+红黑树（JDK1.8）
├── LinkedHashMap  — 维护插入/访问顺序
├── TreeMap        — 红黑树实现，按 key 排序
├── Hashtable      — 线程安全（已过时）
└── ConcurrentHashMap — 分段锁/CAS+synchronized
```

**Collection 与 Map 的区别**：
- Collection 存储单列数据，Map 存储键值对数据
- Collection 的子接口 List 有序可重复，Set 无序不可重复
- Map 的 key 无序不可重复（底层是 Set），value 无序可重复

---

### ArrayList 底层结构

ArrayList 底层基于 **Object 数组** 实现，默认初始容量为 10。

```java
// JDK 源码中的关键字段
private static final int DEFAULT_CAPACITY = 10;       // 默认容量
private static final Object[] EMPTY_ELEMENTDATA = {};  // 空数组（指定容量为0时）
private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {}; // 默认空数组
transient Object[] elementData; // 实际存储元素的数组
private int size;               // 实际元素数量
```

#### 为什么 new ArrayList<>() 时建议指定初始化容量值？

**核心原因：避免频繁扩容，减少内存拷贝。**

1. **不指定容量时**：初始容量为 0（注意不是 10），第一次 `add()` 时才扩容到 10
2. **后续扩容**：每次容量不够时，创建新数组（1.5倍），通过 `Arrays.copyOf()` 将旧数组数据复制到新数组
3. **扩容代价**：
   - 创建新数组需要分配内存
   - 复制旧数组数据是 O(n) 操作
   - 旧数组需要被 GC 回收，增加 GC 压力

**示例**：如果已知要存储 1000 个元素，不指定容量会经历：0→10→15→22→33→49→73→109→163→244→366→549→823→1234，共 13 次扩容和数据拷贝。而直接指定 1000，一次扩容都不需要。

```java
// 推荐：已知大致数量时指定容量
List<String> list = new ArrayList<>(1000);

// 不推荐：每次 add 可能触发扩容
List<String> list = new ArrayList<>();
```

#### 为什么默认扩容为 1.5 倍？

```java
// ArrayList.grow() 源码
private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1); // 右移1位 = 除以2，即1.5倍
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

**1.5 倍是内存使用和性能之间的权衡经验值**：
- **太小（如 1.1 倍）**：频繁扩容，每次都要创建新数组 + 复制数据，性能差
- **太大（如 2 倍以上）**：每次扩容后空闲空间过多，浪费内存
- **为什么不是 2 倍**：1.5 倍可以在多次扩容后，复用之前释放的内存空间。例如：扩容到 15 后释放了原来大小 10 的空间，下次扩容到 22 时，之前释放的 10 + 新释放的 5 刚好够用。而 2 倍则永远无法复用之前的内存
- **经验表明**：1.5 倍在时间和空间上取得了较好的平衡

#### ArrayList 是线程安全的吗？

ArrayList **不是线程安全的**。多线程并发修改时会出现以下问题：

1. **元素覆盖**：两个线程同时 `add()`，可能写入同一个数组位置，导致元素丢失
2. **数组越界**：线程 A 判断 `size < capacity` 后被挂起，线程 B 完成 add 使 `size == capacity`，线程 A 恢复后直接写入导致越界
3. **数据不一致**：并发修改导致 `size` 与实际元素数量不匹配

**解决方案**：

| 方案 | 原理 | 适用场景 |
|------|------|---------|
| `Collections.synchronizedList()` | 所有方法加 synchronized | 通用场景 |
| `CopyOnWriteArrayList` | 写时复制，读写分离 | 读多写少 |
| `Vector`（不推荐） | 所有方法加 synchronized | 已过时 |

#### CopyOnWriteArrayList 实现原理

```java
// CopyOnWriteArrayList 核心源码
public boolean add(E e) {
    final ReentrantLock lock = this.lock;
    lock.lock(); // 加锁
    try {
        Object[] elements = getArray();
        int len = elements.length;
        Object[] newElements = Arrays.copyOf(elements, len + 1); // 复制新数组
        newElements[len] = e;
        setArray(newElements); // 指向新数组
        return true;
    } finally {
        lock.unlock(); // 解锁
    }
}

public E get(int index) {
    return get(getArray(), index); // 直接读，不加锁
}
```

**核心思想：读写分离**
1. **读操作**：直接读取当前数组，不加锁，性能高
2. **写操作**：
   - 加锁（ReentrantLock）
   - 复制一份当前数组（长度+1）
   - 在新数组上修改
   - 将引用指向新数组
   - 解锁
3. **读到的是快照**：读操作读的是写操作之前的旧数组，因此读到的数据可能不是实时最新的

**优点**：读操作完全无锁，适合读多写少场景（如配置信息、监听器列表）
**缺点**：
- 写操作需要复制整个数组，内存占用大
- 写操作性能差（加锁 + 复制）
- 数据弱一致性（读到的可能是旧数据）

---

### HashMap 底层结构

**JDK1.7**：数组 + 链表
**JDK1.8**：数组 + 链表 + 红黑树

```java
// JDK1.8 HashMap 关键字段
static final int DEFAULT_INITIAL_CAPACITY = 1 << 4; // 16，默认初始容量
static final int MAXIMUM_CAPACITY = 1 << 30;        // 最大容量
static final float DEFAULT_LOAD_FACTOR = 0.75f;     // 默认加载因子
static final int TREEIFY_THRESHOLD = 8;             // 链表转红黑树阈值
static final int UNTREEIFY_THRESHOLD = 6;           // 红黑树退化为链表阈值
static final int MIN_TREEIFY_CAPACITY = 64;         // 链表转红黑树的最小数组容量
transient Node<K,V>[] table;                        // 底层数组
transient int size;                                 // 元素数量
```

#### HashMap 添加元素完整流程

```
put(key, value) 调用流程：
│
├─ 1. 计算 key 的 hash 值
│     hash = key.hashCode() ^ (key.hashCode() >>> 16)
│     // 高16位与低16位异或，减少碰撞
│
├─ 2. 判断数组是否为空/长度为0
│     └─ 是 → resize() 初始化数组（默认长度16）
│
├─ 3. 计算数组下标
│     index = (n - 1) & hash  // n为数组长度
│     // 等价于 hash % n（当n是2的次幂时）
│
├─ 4. 判断 table[index] 是否为空
│     ├─ 空 → 直接创建新节点放入
│     └─ 不为空 → 进入步骤5
│
├─ 5. 判断首节点的 key 是否与当前 key 相同
│     ├─ 相同（hash相同且equals为true）→ 覆盖 value
│     └─ 不相同 → 进入步骤6
│
├─ 6. 判断首节点是否是 TreeNode（红黑树节点）
│     ├─ 是 → 调用 putTreeVal() 插入红黑树
│     └─ 不是 → 进入步骤7（链表）
│
├─ 7. 遍历链表
│     ├─ 找到相同 key → 覆盖 value
│     └─ 未找到 → 尾部插入新节点
│        └─ 插入后判断链表长度是否 >= 8
│           ├─ 是 → 调用 treeifyBin()
│           │     └─ 判断数组长度是否 >= 64
│           │        ├─ 是 → 链表转红黑树
│           │        └─ 否 → 先扩容（数组长度翻倍）
│           └─ 否 → 继续保持链表
│
└─ 8. 判断是否需要扩容
      └─ size > capacity * loadFactor → resize() 扩容
```

**为什么链表长度 >= 8 且数组长度 >= 64 才转红黑树？**

- 链表长度达到 8 的概率已经非常低（基于泊松分布，概率约为 0.00000006）
- 如果数组长度很短就转红黑树，频繁扩容会导致红黑树退化为链表，浪费性能
- 红黑树节点占用空间是链表节点的 2 倍，空间换时间需要权衡

#### HashMap 扩容加载因子为什么是 0.75？

**基于泊松分布的数学推导**：

HashMap 中每个桶的元素个数服从泊松分布，参数 λ = 0.5（当加载因子为 0.75 时）：

| 桶中元素个数 k | 泊松概率 P(X=k) |
|:---:|:---:|
| 0 | 0.60653066 |
| 1 | 0.30326533 |
| 2 | 0.07581633 |
| 3 | 0.01263606 |
| 4 | 0.00157952 |
| 5 | 0.00015795 |
| 6 | 0.00001316 |
| 7 | 0.00000094 |
| 8 | 0.00000006 |

可以看到，当加载因子为 0.75 时：
- 桶中元素 >= 8 的概率仅为 **0.00000006**，几乎不可能发生
- 这也是为什么选择 8 作为链表转红黑树的阈值（概率极低才触发，避免浪费）

**为什么不是其他值？**
- **太小（如 0.5）**：扩容太频繁，空间利用率低（只用了一半就扩容）
- **太大（如 1.0）**：哈希冲突概率增大，链表变长，查询从 O(1) 退化为 O(n)
- **0.75** 是时间和空间的折中，JDK 作者通过大量实验得出的最佳值

#### HashMap 扩容为什么是 2 倍？

```java
// resize() 核心逻辑
int newCap = oldCap << 1; // 左移1位 = 乘以2
```

**核心原因：保持数组长度始终是 2 的次幂，使 `(n-1) & hash` 等价于 `hash % n`。**

1. **位运算替代取模**：`&` 运算比 `%` 运算快得多
2. **2 的次幂的特性**：`n-1` 的二进制全为 1（如 16-1=15，二进制 01111），与 hash 做 `&` 运算时，结果完全取决于 hash 的低位，分布均匀
3. **扩容时的元素迁移优化**：扩容为 2 倍后，每个元素的新位置要么在原位置，要么在原位置 + 旧数组长度。只需判断 hash 的新增高位是 0 还是 1：
   - 是 0 → 位置不变
   - 是 1 → 位置 = 原位置 + 旧数组长度

```java
// 扩容时判断元素新位置
if ((e.hash & oldCap) == 0) {
    // 新位置 = 原位置（低位不变）
} else {
    // 新位置 = 原位置 + oldCap（高位+1）
}
```

#### HashMap 是线程安全的吗？

HashMap **不是线程安全的**：

**JDK1.7 的问题**：
- **环形链表**：多线程并发扩容时，头插法导致链表形成环，后续 get 操作会陷入死循环，CPU 100%
- **数据丢失**：并发 put 时可能覆盖已有的键值对

**JDK1.8 的问题**：
- 虽然改为尾插法解决了环形链表问题，但并发 put 仍然会**数据覆盖**
- 线程 A 判断桶为空准备写入时，线程 B 也判断为空并先写入，线程 A 恢复后直接覆盖

---

### ConcurrentHashMap 实现原理

#### JDK1.7：分段锁（Segment）

```
ConcurrentHashMap
├── Segment[] segments（默认16个段）
│   ├── Segment[0] → HashEntry[] → 链表
│   ├── Segment[1] → HashEntry[] → 链表
│   ├── ...
│   └── Segment[15] → HashEntry[] → 链表
```

**核心设计**：
- 将整个 Map 分成 16 个 Segment（段），每个 Segment 继承 ReentrantLock
- 每个 Segment 内部是一个小的 HashMap（数组 + 链表）
- **不同的 Segment 使用不同的锁**，最多支持 16 个线程并发写入
- Segment 数量在初始化后**不可改变**（并发度固定）

```java
// JDK1.7 核心结构
static final class Segment<K,V> extends ReentrantLock {
    transient volatile HashEntry<K,V>[] table;
    transient int count;
}

// put 操作
public V put(K key, V value) {
    Segment<K,V> s;
    int hash = hash(key);
    int j = (hash >>> segmentShift) & segmentMask;
    s = segments[j]; // 定位到具体的 Segment
    s.lock(); // 锁住该 Segment
    try {
        // 在 Segment 内部执行 put
    } finally {
        s.unlock();
    }
}
```

**JDK1.7 的问题**：
- Segment 数量固定（默认16），并发度有限
- 不同 Segment 之间不能同时扩容
- 查询遍历需要跨多个 Segment

#### JDK1.8：CAS + synchronized

JDK1.8 的 ConcurrentHashMap 与 HashMap 结构一致（数组 + 链表 + 红黑树），但通过 **CAS + synchronized** 保证线程安全。

```java
// JDK1.8 核心结构
transient volatile Node<K,V>[] table;
private transient volatile Node<K,V>[] nextTable;

static class Node<K,V> {
    final int hash;
    final K key;
    volatile V val;
    volatile Node<K,V> next;
}
```

**put 操作详细源码分析**：

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException();
    int hash = spread(key.hashCode());
    int binCount = 0;
    for (Node<K,V>[] tab = table;;) { // 自旋
        Node<K,V> f; int n, i, fh;
        
        // 情况1：数组为空，CAS 初始化数组
        if (tab == null || (n = tab.length) == 0)
            tab = initTable(); // CAS 设置 sizeCtl
        
        // 情况2：桶位置为空，CAS 设置头节点
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value, null)))
                break; // CAS 成功，跳出循环
            // CAS 失败（其他线程先插入了），继续自旋
        }
        
        // 情况3：正在扩容（头节点 hash == MOVED）
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f); // 帮助迁移数据
        
        // 情况4：桶位置不为空，synchronized 锁住头节点
        else {
            V oldVal = null;
            synchronized (f) { // 锁住头节点
                if (tabAt(tab, i) == f) { // 二次确认头节点未变
                    if (fh >= 0) { // 链表
                        binCount = 1;
                        for (Node<K,V> e = f;; ++binCount) {
                            K ek;
                            if (e.hash == hash &&
                                ((ek = e.key) == key || 
                                 (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value; // 覆盖 value
                                break;
                            }
                            Node<K,V> pred = e;
                            if ((e = e.next) == null) {
                                pred.next = new Node<>(hash, key, value, null);
                                break; // 尾部插入
                            }
                        }
                    }
                    else if (f instanceof TreeBin) { // 红黑树
                        // 红黑树插入逻辑
                    }
                }
            }
            if (binCount != 0) {
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i); // 链表转红黑树
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    addCount(1L, binCount);
    return null;
}
```

**三种线程安全机制的使用场景**：

| 场景 | 机制 | 原因 |
|------|------|------|
| 数组初始化 | CAS | 短时间操作，无锁自旋高效 |
| 设置头节点 | CAS | 短时间操作，只有一个线程能成功 |
| 遍历链表/红黑树 | synchronized | 长时间操作，加锁避免自旋浪费 CPU |
| 扩容迁移 | CAS + synchronized | 多线程协助迁移，每个桶独立加锁 |

**为什么不同操作用不同方式保证线程安全？**

- **CAS 适合短时间任务**（初始化数组、设置头节点）：无锁自旋，性能高。但如果自旋时间过长，会过度占用 CPU
- **synchronized 适合长时间、高竞争任务**（遍历桶、插入节点）：加锁后其余线程休眠不占用 CPU，避免无效自旋
- 体现了"**无锁优先，锁为补充**"的并发编程思想

**JDK1.8 相比 JDK1.7 的优势**：
1. 锁粒度从**段**细化到**单个桶**，减少锁竞争
2. 数据结构与 HashMap 一致（数组+链表+红黑树），查询效率高
3. 支持多线程协助扩容，提高扩容效率
4. size() 计算更高效（基于 baseCount + CounterCell[]）

## 相关笔记
- [[单机系统并发提升方案]]
- [[AQS 公平锁与非公平锁实现]]
- [[CAS 与 JMM 内存模型]]

## 来源
来源：Java八股文PDF

