---
tags: [八股文, 场景题, 面试]
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# 百万级Excel导入数据库

## 问题
百万级数据从Excel导入到数据库，如何避免OOM并保证高性能？

## 面试考察点
- 大数据处理能力：海量数据导入的实践经验
- 性能优化：解析、传输、写入各环节的优化技巧
- 健壮性设计：异常处理、断点续传、错误率控制
- 全流程思维：从文件解析到数据库落盘的完整链路

## 解题思路
> 核心矛盾：传统POI将整个Excel加载到内存，百万行必然OOM

解决思路是"流式读取 + 队列缓冲 + 批量写入"三段式架构。读取端用EasyExcel的SAX模式逐行解析，避免全量加载；中间用Disruptor无锁队列做缓冲和背压；写入端用JDBC Batch或MyBatis-Plus批量插入，减少数据库交互次数。

关键设计点：批处理大小（读取10000条一批，写入1000条一批）、数据校验（JSR303 + 业务规则）、容错机制（错误率超1%自动中止、断点续传）。

## 具体方案
### 方案一：EasyExcel + Disruptor + MyBatis-Plus Batch（推荐）
- **读取层**：EasyExcel监听器逐行读取，每10000条发布到Disruptor队列
- **缓冲层**：Disruptor环形缓冲区（1M大小），多生产者模式，BlockingWaitStrategy背压
- **写入层**：MyBatis-Plus `insertBatch`，每1000条批量插入
- 优点：内存稳定在500MB以内，150万行从8小时优化到12分钟

### 方案二：EasyExcel + 手动JDBC Batch
- PreparedStatement批量提交，每5000条executeBatch + commit
- 导入前 `ALTER TABLE DISABLE KEYS` 关闭索引，完成后恢复
- 多线程：按文件分片，线程池大小 = CPU核数 * 2

### 方案三：Spring Batch企业级方案
- 内置ItemReader/Processor/Writer分层架构
- 支持分区（Partitioning）并行处理
- 内置重试、跳过、作业仓库（断点续传）

## 要点总结
- 必须用流式解析（EasyExcel SAX模式），绝不能用POI全量加载
- 三级批处理：读取10000条/批 → Disruptor缓冲 → 写入1000条/批
- 数据校验分两层：字段格式校验（@NotBlank/@Pattern）+ 业务规则校验
- 性能优化组合拳：批量插入、临时禁用索引、多线程分片、关闭自动提交
- 容错设计：错误率超阈值自动中止、记录失败行号、支持断点续传

## 相关笔记
- [[千万级数据查询优化]]
- [[for循环数据库调用优化]]
- [[日志打印瓶颈优化]]

