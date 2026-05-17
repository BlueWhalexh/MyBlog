---
tags: [八股文, JVM, 面试]
source: "[[todoList_detail#Day 29]]"
date: 2026-03-14
---

# G1 GC 详细流程

## 问题
G1（Garbage First）垃圾收集器的详细回收流程是什么？

## 答案

**G1（Garbage First）特点**：
- 区域化内存管理（Region，1-32MB）
- 可预测停顿时间（`-XX:MaxGCPauseMillis=200`）
- 标记-整理算法，无内存碎片

**回收流程**：
```
1. 初始标记（Initial Mark）：STW，标记GC Roots直接引用
2. 根区域扫描（Root Region Scan）：并发，扫描Survivor区引用
3. 并发标记（Concurrent Mark）：并发，遍历整个堆
4. 最终标记（Remark）：STW，修正并发期间的变动
5. 筛选回收（Cleanup）：STW，按回收价值排序Region，优先回收垃圾最多的Region
6. 复制/整理（Evacuation）：将存活对象复制到空Region，清空原Region
```

## 相关笔记
- [[JVM 优化策略]]
- [[频繁 GC 的原因分析]]
- [[类加载每一步具体做了什么]]

## 来源
原始记录：[[todoList_detail#Day 29 (03-14)]]

