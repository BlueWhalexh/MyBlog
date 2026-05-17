---
tags: [八股文, MySQL, 面试]
source: "[[todoList_detail#Day 42]]"
date: 2026-03-31
---

# MySQL 为了加速写入速度做了哪些优化？

## 问题
MySQL 在写入性能方面做了哪些优化？

## 答案

首先是 WAL（预写式日志）：不直接写数据文件，先写 redo log，顺序写比随机写快很多。redo log 是循环写入的，写满了才刷盘。两阶段提交保证 redo log 和 binlog 一致性：先写 redo log（prepare 状态）→ 写 binlog → 提交 redo log（commit 状态）。

其次是 Buffer Pool：热点数据和索引页缓存在内存里，读写在内存完成，定期刷盘。Change Buffer 专门缓存非唯一二级索引的修改，等空闲时再合并。Doublewrite Buffer 防止页损坏，写数据前先写一份副本，宕机恢复时用副本修复。

刷盘时机：后台线程每秒刷一次、脏页比例超过阈值触发刷盘、redo log 写满触发刷盘、正常关闭时刷盘。

## 相关笔记
- [[MySQL 三种日志]]
- [[MySQL B+树与红黑树对比]]
- [[千万级数据表 CURD 效率低如何优化]]

## 来源
原始记录：[[todoList_detail#Day 42 (03-31)]]
