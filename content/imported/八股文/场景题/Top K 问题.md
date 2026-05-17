---
tags: [八股文, 场景题, 面试]
source: "Java面试准备"
date: 2026-04-30
---

# Top K 问题

## 问题

给定 1 亿个数据，取出其中最大的前 100 个（Top 100）。如何实现？

## 方案一：小顶堆

### 核心思路

维护一个大小为 K 的小顶堆。遍历所有数据，当堆未满时直接入堆；当堆已满且当前元素大于堆顶时，替换堆顶元素并调整堆。最终堆中就是最大的 K 个元素。

**为什么用小顶堆而非大顶堆？**

小顶堆的堆顶是堆中最小的元素，当新元素比堆顶大时，说明新元素应该进入 Top K，此时替换堆顶并调整。大顶堆则无法快速判断新元素是否应该进入 Top K。

### 时间复杂度分析

- 建堆：O(K)
- 遍历剩余 N-K 个元素：每个元素最多一次下沉操作 O(logK)
- 总时间复杂度：O(K + (N-K) × logK) = O(N × logK)
- 当 K 远小于 N 时，近似为 O(N)
- 空间复杂度：O(K)

### 代码实现

```java
public int[] topK(int[] nums, int k) {
    // 小顶堆
    PriorityQueue<Integer> minHeap = new PriorityQueue<>(k);
    
    for (int num : nums) {
        if (minHeap.size() < k) {
            minHeap.offer(num);
        } else if (num > minHeap.peek()) {
            minHeap.poll();    // 移除堆顶（最小值）
            minHeap.offer(num); // 插入新元素
        }
    }
    
    int[] result = new int[k];
    for (int i = 0; i < k; i++) {
        result[i] = minHeap.poll();
    }
    return result; // 注意：结果是升序的
}
```

### 适用场景

- 内存能容纳 K 个元素（通常 K 不会太大）
- 数据可以全部遍历
- 最常用的 Top K 解法

---

## 方案二：快速选择算法（Quick Select）

### 核心思路

基于快速排序的 Partition 思想。每次 Partition 后，pivot 左边的元素都比它大，右边的元素都比它小。如果 pivot 的位置恰好是 K-1，说明 pivot 及其左边就是 Top K。

### 算法步骤

1. 随机选择一个 pivot
2. 对数组进行 Partition，将大于 pivot 的放左边，小于的放右边
3. 如果 pivot 的索引 == K-1，返回前 K 个元素
4. 如果 pivot 的索引 > K-1，在左半部分继续查找
5. 如果 pivot 的索引 < K-1，在右半部分继续查找

### 时间复杂度

- 平均：O(N)（每次排除约一半元素：N + N/2 + N/4 + ... = 2N）
- 最坏：O(N^2)（每次 pivot 选到极端值）
- 空间复杂度：O(1)（原地操作）

### 代码实现

```java
public int[] topK(int[] nums, int k) {
    quickSelect(nums, 0, nums.length - 1, k - 1);
    return Arrays.copyOf(nums, k);
}

private void quickSelect(int[] nums, int left, int right, int k) {
    if (left >= right) return;
    
    int pivotIndex = partition(nums, left, right);
    
    if (pivotIndex == k) {
        return; // 找到了
    } else if (pivotIndex > k) {
        quickSelect(nums, left, pivotIndex - 1, k);
    } else {
        quickSelect(nums, pivotIndex + 1, right, k);
    }
}

private int partition(int[] nums, int left, int right) {
    // 随机选择 pivot，避免最坏情况
    int randomIdx = left + new Random().nextInt(right - left + 1);
    swap(nums, randomIdx, right);
    
    int pivot = nums[right];
    int i = left;
    
    for (int j = left; j < right; j++) {
        if (nums[j] > pivot) { // 注意：降序排列
            swap(nums, i, j);
            i++;
        }
    }
    swap(nums, i, right);
    return i;
}

private void swap(int[] nums, int i, int j) {
    int temp = nums[i];
    nums[i] = nums[j];
    nums[j] = temp;
}
```

### 适用场景

- 数据可以全部放入内存
- 需要精确的 Top K 结果
- K 较大时比小顶堆更快

---

## 方案三：分治 + MapReduce（分布式场景）

### 核心思路

当数据量极大（如 1 亿）无法放入单机内存时，将数据分片到多台机器上并行处理，最后合并结果。

### 算法步骤

```
1. 将 1 亿数据分成 100 个文件，每个文件 100 万条
2. 每台机器（或线程）对一个文件求 Top K
3. 将 100 个 Top K 结果汇总到一台机器
4. 对汇总后的 100 × K 个数据再求 Top K
```

### 代码框架（Java 多线程版）

```java
public int[] topKParallel(List<int[]> dataFiles, int k) 
        throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors());
    
    List<Future<int[]>> futures = new ArrayList<>();
    
    // 每个文件求 Top K
    for (int[] fileData : dataFiles) {
        futures.add(executor.submit(() -> topKSingle(fileData, k)));
    }
    
    // 汇总所有结果
    List<Integer> allCandidates = new ArrayList<>();
    for (Future<int[]> future : futures) {
        for (int num : future.get()) {
            allCandidates.add(num);
        }
    }
    
    // 对汇总结果再求 Top K
    int[] merged = allCandidates.stream().mapToInt(i -> i).toArray();
    return topKSingle(merged, k);
}

private int[] topKSingle(int[] nums, int k) {
    // 使用小顶堆或快速选择
    PriorityQueue<Integer> minHeap = new PriorityQueue<>(k);
    for (int num : nums) {
        if (minHeap.size() < k) {
            minHeap.offer(num);
        } else if (num > minHeap.peek()) {
            minHeap.poll();
            minHeap.offer(num);
        }
    }
    return minHeap.stream().mapToInt(i -> i).toArray();
}
```

### MapReduce 版本思路

```
Map 阶段：
  - 每个 Mapper 读取一个数据分片
  - 输出 (key=1, value=数据) 对

Reduce 阶段：
  - Reducer 收集所有数据
  - 使用小顶堆求出 Top K

优化：可以在 Map 阶段就先求出本地 Top K，减少 Shuffle 数据量
```

### 适用场景

- 数据量极大，单机内存不够
- 已有分布式计算框架（Spark/Flink/Hadoop）
- 线上系统需要处理海量数据

---

## 方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| 小顶堆 | O(N logK) | O(K) | K 较小、通用场景（首选） |
| 快速选择 | O(N) 平均 | O(1) | K 较大、数据可全放入内存 |
| 分治+MapReduce | O(N logK / P) | O(K × P) | 海量数据、分布式场景 |
| 全排序 | O(N logN) | O(N) | 不推荐（过度排序） |

---

## 扩展：其他 Top K 变体

### 求第 K 大的元素

```java
// LeetCode 215. Kth Largest Element
public int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>(k);
    for (int num : nums) {
        if (minHeap.size() < k) {
            minHeap.offer(num);
        } else if (num > minHeap.peek()) {
            minHeap.poll();
            minHeap.offer(num);
        }
    }
    return minHeap.peek();
}
```

### 流式数据的 Top K（数据不断流入）

使用小顶堆维护 Top K，每来一个新数据就和堆顶比较。空间始终为 O(K)，适合实时场景。

### 频率最高的 K 个元素

先用 HashMap 统计频率，再用小顶堆取频率最高的 K 个。

## 常见追问

### Q：1 亿个 int 占多大内存？

> 1 亿 × 4 字节 = 400MB。对于现代服务器来说可以放入内存。如果数据更大（如 100 亿），就需要用分治方案。

### Q：为什么不用 TreeMap？

> TreeMap 可以做到 O(N logK)，但常数因子比小顶堆大，且实现更复杂。小顶堆用数组实现，缓存友好性更好。

### Q：快速选择的最坏情况如何避免？

> 1. 随机选择 pivot（代码中已实现）
> 2. 三数取中法（Median of Three）
> 3. 如果仍然担心最坏情况，直接用小顶堆更稳妥

## 相关笔记
- [[集合框架基础 — ArrayList 与 HashMap]]
- [[大文件排序]]
