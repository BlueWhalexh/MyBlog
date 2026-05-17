---
tags: [八股文, Elasticsearch, 面试]
source: "[[todoList_detail#Day 29]]"
date: 2026-03-14
---

# ES 倒排索引详解

## 问题
Elasticsearch 的倒排索引是什么结构？与 B+树索引有什么区别？

## 答案

**倒排索引（Inverted Index）结构**：
```
文档集合：
Doc1: "Java is good"
Doc2: "Python is good"
Doc3: "Java and Python"

倒排索引：
Term    | Doc IDs (Posting List)
--------|------------------------
java    | Doc1, Doc3
python  | Doc2, Doc3
good    | Doc1, Doc2
is      | Doc1, Doc2
and     | Doc3
```

**核心组件**：
| 组件 | 作用 |
|------|------|
| **Term Dictionary** | 存储所有词项，使用FST（有限状态转换）压缩，支持快速前缀查找 |
| **Posting List** | 记录包含该词的文档ID列表，使用RoaringBitmap压缩 |
| **Term Index** | 词项索引，加速Term Dictionary查找 |

**倒排索引 vs B+树索引**：
| 场景 | 优势 |
|------|------|
| 全文搜索 | 倒排索引天然适合关键词检索 |
| 精确匹配/范围查询 | B+树更优 |

## 相关笔记
- [[ES 使用中的问题及解决方案]]
- [[深分页优化思路]]

## 来源
原始记录：[[todoList_detail#Day 29 (03-14)]]
