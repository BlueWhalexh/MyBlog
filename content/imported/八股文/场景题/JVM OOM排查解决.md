---
tags: [八股文, 场景题, 面试, 线上排查]
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# JVM OOM排查解决

## 问题
线上JVM出现OutOfMemoryError，如何排查和解决？

## 面试考察点
- 五种OOM类型的区分和针对性处理（heap space、native thread、Metaspace、Direct buffer、GC overhead）
- "发现问题 -> 止血 -> 分析 -> 规避"的闭环排查思路
- Heap Dump分析工具（MAT）的使用能力

## 排查思路
> 排查闭环：问题发现（日志监控/jstat）-> 问题止血（自动重启）-> 问题分析（Heap Dump）-> 问题规避（代码修复）

## 具体排查步骤
1. **发现OOM**：日志监控关键字`OutOfMemoryError`；配置`-XX:+ExitOnOutOfMemoryError`自动退出触发告警；`jstat -gcutil $pid 1000`监控老年代使用率
2. **止血**：配置`-XX:+HeapDumpOnOutOfMemoryError`自动dump后进程退出，借助K8s自动重启
3. **分析Dump**：用Eclipse MAT分析heap dump，找出占用内存最大的对象类型
4. **区分两种情况**：对象分布正常（堆太小）vs 某类对象占比异常（内存泄漏）
5. **针对性修复**

## 五种OOM类型及解决方案
| OOM类型 | 原因 | 解决方案 |
|---------|------|---------|
| Java heap space | 堆内存不足或内存泄漏 | 增大堆/排查泄漏 |
| unable to create native thread | 线程数超限或native内存不足 | 减少线程数/增大系统限制 |
| Metaspace | 类元数据空间不足 | 增大-XX:MaxMetaspaceSize |
| Direct buffer memory | Direct ByteBuffer超64MB限制 | 调整-XX:MaxDirectMemorySize |
| GC overhead limit exceeded | 98%时间都在GC | 增大堆/排查内存泄漏 |

## 常见内存泄漏原因
- ThreadLocal未清理
- 未分页的大数据量查询
- 定时任务中List未清空反复追加
- 监控系统用不可控字段作为label导致无限增长

## 要点总结
- OOM止血靠自动化：HeapDump + 进程退出 + K8s重启，前提是业务支持故障转移或请求幂等
- 堆设置过小 vs 内存泄漏：看对象分布是否均匀，某类对象占比30%+大概率是泄漏
- 分析Dump时注意勾选"Keep unreachable objects"避免误判

## 相关笔记
- [[频繁FullGC排查解决]]
- [[CPU使用率高排查思路]]
- [[JVM 垃圾回收机制]]

