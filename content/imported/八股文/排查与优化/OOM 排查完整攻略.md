---
tags: [八股文, 排查与优化, JVM, 面试]
source: "[[todoList_detail#Day 29]]"
date: 2026-03-14
---

# OOM 排查完整攻略

## 问题
线上发生 OOM（OutOfMemoryError），如何排查和定位？

## 答案

**排查流程**：
```bash
# 1. 开启OOM时自动生成堆dump
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/path/to/dump.hprof

# 2. OOM发生后分析
$ jmap -dump:format=b,file=heap.hprof <pid>

# 3. 使用工具分析
- **VisualVM**：图形界面，适合初学者
- **Eclipse MAT**：专业分析工具，可定位内存泄漏
- **jhat**：JDK自带命令行工具
```

**MAT分析关键指标**：
| 指标 | 含义 | 关注点 |
|------|------|--------|
| **Dominator Tree** | 对象支配树 | 找出占用内存最大的对象 |
| **Histogram** | 类实例统计 | 哪些类实例数异常 |
| **Leak Suspects** | 泄漏嫌疑报告 | 自动分析可能的泄漏点 |

## 相关笔记
- [[CPU 100% 排查完整流程]]
- [[频繁 GC 的原因分析]]
- [[JVM 优化策略]]

## 来源
原始记录：[[todoList_detail#Day 29 (03-14)]]
