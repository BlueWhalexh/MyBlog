---
tags: [八股文, MySQL, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# MySQL 索引失效的常见场景

## 问题
哪些情况下 MySQL 的索引会失效？如何避免索引失效？

## 答案

索引失效会导致查询退化为全表扫描，严重影响性能。以下是常见的索引失效场景：

### 1. 对索引列使用函数或表达式
```sql
-- 失效：对索引列使用函数
SELECT * FROM user WHERE YEAR(create_time) = 2024;
-- 优化：改为范围查询
SELECT * FROM user WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01';
```
原因：索引是基于原始列值建立的B+树，对列使用函数后，MySQL 无法利用索引树直接定位。

### 2. 隐式类型转换
当字符串列与数字比较时，MySQL 会进行隐式类型转换，等价于对列使用 `CAST()` 函数，导致索引失效。
```sql
-- phone 是 varchar 类型，传入数字会导致索引失效
SELECT * FROM user WHERE phone = 13800138000;
-- 优化：使用字符串
SELECT * FROM user WHERE phone = '13800138000';
```

### 3. 使用 != 或 NOT IN
```sql
SELECT * FROM user WHERE status != 1;
SELECT * FROM user WHERE id NOT IN (1, 2, 3);
```
当不等于条件的返回结果集占总数据比例较大时，优化器会选择全表扫描。如果比例很小，仍可能走索引。

### 4. OR 条件中有未建索引的列
```sql
-- 如果 name 没有索引，整个查询不会走索引
SELECT * FROM user WHERE age = 20 OR name = 'Tom';
```
优化：确保 OR 两边的列都有索引，或改写为 `UNION ALL`。

### 5. LIKE 以通配符开头
```sql
-- 失效：以 % 开头无法利用索引的有序性
SELECT * FROM user WHERE name LIKE '%Tom';
-- 有效：以固定字符开头可以走索引
SELECT * FROM user WHERE name LIKE 'Tom%';
```

### 6. 联合索引不满足最左前缀原则
```sql
-- 联合索引 (a, b, c)
SELECT * FROM t WHERE b = 1 AND c = 2;  -- 失效，缺少最左列 a
SELECT * FROM t WHERE a = 1 AND c = 2;  -- 部分有效，只用到 a
```

### 7. 数据量小时优化器选择全表扫描
MySQL 优化器会根据统计信息估算查询成本。当表中数据量很小，或查询返回的行数占总行数比例很大时（通常超过 30%），优化器会认为全表扫描比使用索引更高效。

### 8. 索引列参与计算
```sql
-- 失效
SELECT * FROM user WHERE id + 1 = 10;
-- 优化
SELECT * FROM user WHERE id = 9;
```

## 相关笔记
- [[MySQL 联合索引最左前缀原则]]
- [[MySQL EXPLAIN 分析]]

## 来源
来源：Java八股文PDF

