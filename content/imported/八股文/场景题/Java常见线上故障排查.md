---
tags:
  - 八股文
  - 场景题
  - 面试
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# Java常见线上故障排查

## 问题

Java线上常见故障有哪些？如何系统化排查？

## 面试考察点

- 故障分类（CPU/内存/磁盘/网络）
- 排查工具链（top/jps/jmap/jstack/Arthas）
- JVM问题定位命令
- GC日志分析

## 解题思路

线上故障排查遵循**由外到内**的顺序：业务日志 -> APM -> 物理环境 -> 应用服务 -> JVM。

## 具体方案

### 1. 故障分类
- **系统异常**：CPU 99%、磁盘100%、内存不足
- **业务异常**：服务自动退出、调用超时、并发异常、死锁

### 2. 排查顺序
1. **业务日志**：大部分错误在日志中有体现
2. **APM分析**：Skywalking/Zipkin全链路追踪
3. **物理环境**：CPU/内存/磁盘/网络
4. **应用服务**：JVM/线程/内存
5. **云厂商问题**：查看官方公告

### 3. 常用Linux命令
- `top`：查看CPU使用率和进程
- `free -m`：查看内存使用情况
- `df -h`：查看磁盘空间
- `dstat`：综合查看CPU/磁盘/网络

### 4. Arthas诊断工具
- `dashboard`：实时面板（线程/内存/GC/Runtime）
- `thread -b`：一键检测死锁
- `trace`：方法调用路径+耗时
- `jad`：反编译已加载类
- `logger`：动态更新日志级别

### 5. JVM命令
- `jps`：查询Java进程ID
- `jmap -heap pid`：堆内存信息
- `jmap -histo:live pid`：内存对象排序
- `jstack pid`：线程栈信息（排查死锁）
- `jstat -gcutil pid`：GC统计

### 6. GC分析
- 频繁FGC -> 老年代内存不足
- YGC耗时过长 -> 新生代过大或对象过大
- CMS concurrent mode failed -> GC速度跟不上分配速度

## 要点总结

1. 排查顺序：日志 -> APM -> 物理环境 -> JVM -> 云厂商
2. Arthas是Java诊断利器，比原生JVM命令更易用
3. top + jps + jstack三板斧定位CPU和死锁问题
4. jmap dump内存快照，用MAT分析内存泄漏
5. GC日志是排查JVM问题的关键依据

## 相关笔记

- [[API接口响应慢排查定位]]
- [[分布式链路跟踪系统设计]]
