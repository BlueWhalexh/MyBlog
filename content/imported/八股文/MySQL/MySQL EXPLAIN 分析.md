---
tags: [八股文, MySQL, 面试]
source: "[[todoList_detail#Day 29]]"
date: 2026-03-14
---

# MySQL EXPLAIN 分析

## 问题
MySQL 的 EXPLAIN 命令关键字段有哪些？如何根据执行计划优化 SQL？

## 答案

**EXPLAIN关键字段**：

| 字段 | 关注值 | 优化方向 |
|------|--------|----------|
| **type** | system > const > eq_ref > ref > range > index > ALL | 避免ALL（全表扫描） |
| **key** | 实际使用的索引名 | 确保不是NULL |
| **rows** | 扫描行数估算 | 越小越好 |
| **Extra** | Using index（覆盖索引）、Using where、Using filesort（需优化） | 避免filesort/temporary |

**优化示例**：
```sql
-- 原始SQL（type=ALL）
SELECT * FROM user WHERE YEAR(create_time) = 2024;

-- 优化后（type=range，走索引）
SELECT * FROM user WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01';
```

## 相关笔记
- [[MySQL 联合索引最左前缀原则]]
- [[深分页优化思路]]
- [[千万级数据表 CURD 效率低如何优化]]

## 来源
原始记录：[[todoList_detail#Day 29 (03-14)]]
