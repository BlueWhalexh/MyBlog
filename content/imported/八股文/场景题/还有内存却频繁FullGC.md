---
tags: [八股文, 场景题, 面试]
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# 还有内存却频繁FullGC

## 问题
假设还有很多内存，有什么情况还会频繁FullGC？

## 面试考察点
- JVM内存管理机制的深入理解（不止堆内存）
- GC触发条件和内存分配策略
- 堆外内存、元空间、Direct Buffer等非堆区域的影响
- 实际生产环境问题排查经验

## 解题思路
> 核心认知：Full GC触发不仅仅是因为堆内存不足，还可能是大对象进老年代、内存泄漏、元空间不足、System.gc()调用、老年代碎片化、Direct Buffer泄漏、类加载器泄漏等原因。

大对象直接进老年代：G1中Humongous Object直接进入老年代，快速填满导致Full GC。内存泄漏：静态集合持续增长、缓存未清理、监听器未注销，导致老年代无法回收。元空间不足：动态生成类（反射/动态代理）导致Metaspace频繁扩容。

System.gc()调用：代码或第三方框架隐式调用。老年代碎片化：CMS碎片严重无法分配连续空间。Direct Buffer泄漏：Netty ByteBuf未正确释放占用堆外内存。类加载器泄漏：Web应用重复部署未释放ClassLoader。ThreadLocal泄漏：线程池中未调用remove()。

## 具体方案
### 方案一：排查大对象和内存泄漏
- jstat -gc观察老年代增长趋势
- MAT分析堆转储，检查支配树定位泄漏对象
- 设置-XX:PretenureSizeThreshold控制大对象阈值

### 方案二：检查元空间和类加载
- jcmd VM.classloader_stats查看类加载数量
- 设置-XX:MaxMetaspaceSize限制元空间大小
- 减少动态代理/反射的频繁使用

### 方案三：检查堆外内存和System.gc()
- jcmd VM.native_memory summary查看堆外内存
- -XX:+DisableExplicitGC禁用显式GC调用
- -XX:MaxDirectMemorySize限制Direct Buffer

## 要点总结
- Full GC不等于OOM，内存充足时仍可能因多种原因触发
- 大对象（G1 Humongous Object）直接进老年代是常见原因
- 内存泄漏（静态集合/ThreadLocal/监听器未注销）导致老年代无法回收
- 元空间OOM会连带触发Full GC，需设置MaxMetaspaceSize限制
- 排查工具链：jstat -> MAT堆转储 -> jcmd native_memory -> GC日志分析触发原因

## 相关笔记
- [[频繁 GC 的原因分析]]
- [[JVM 内存结构与运行时数据区]]
- [[OOM 排查完整攻略]]
- [[G1 GC 详细流程]]
