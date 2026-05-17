---
tags: [八股文, Java基础, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# JDK 新特性概览

## 问题
JDK 各版本有哪些重要新特性？什么是泛型类型擦除？虚拟线程是什么，为什么需要虚拟线程？

## 答案

### JDK5 新特性 — 泛型

泛型是 JDK5 引入的特性，允许在定义类、接口或方法时使用类型参数，使用时用具体类型替换。

**泛型的好处**：
1. **类型安全**：编译时检查类型匹配，避免运行时 `ClassCastException`
2. **代码复用**：为多种数据类型编写同一套逻辑，提高复用性

**类型擦除**：
- Java 泛型实现的核心机制
- 编译器在编译阶段将泛型代码中的类型参数信息"擦除"，替换为原生类型（如 `Object`）
- 生成的字节码中不再保留泛型的类型信息
- 泛型仅在编译阶段检查类型匹配，运行时已不存在泛型信息

**为什么需要类型擦除？**
- Java 引入泛型时（Java 5），面临**向后兼容**问题
- 需要泛型代码能运行在不支持泛型的旧版 JVM 上
- 需要旧的非泛型代码（如 `ArrayList`）仍然可用
- 类型擦除是实现兼容性的**妥协方案**

```java
// 编译时
List<String> list = new ArrayList<>();
list.add("hello");
String s = list.get(0);

// 运行时（类型擦除后，等价于）
List list = new ArrayList();
list.add("hello");
String s = (String) list.get(0); // 强制类型转换
```

### JDK8 新特性

**Lambda 表达式**：
- Java 引入函数式编程的核心特性
- 简化匿名内部类的语法，使代码更简洁、可读性更强
- 核心思想：**将函数作为方法参数传递**

```java
// 匿名内部类
list.sort(new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
});

// Lambda 表达式
list.sort((a, b) -> a.compareTo(b));
```

**Stream 流**：
- 对集合数据进行高效、**声明式处理**的 API
- 支持链式操作和并行处理
- 常用于数据过滤、转换、聚合等场景

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
List<String> result = names.stream()
    .filter(name -> name.length() > 3)
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

**Optional**：
- 容器类，优雅处理可能为 null 的对象
- 强制开发者显式检查空值，减少 `NullPointerException`

```java
Optional<String> optional = Optional.ofNullable(getName());
String name = optional.orElse("默认值");
```

### JDK21 新特性 — 虚拟线程

**相关概念**：

| 概念 | 说明 |
|---|---|
| 操作系统线程 | 内核态线程，数量有限（单进程最大约 6 万个），创建和销毁涉及系统调用，上下文切换需陷入内核态，开销高 |
| 平台线程 | JVM 层面的线程，对操作系统线程的包装，**一个平台线程严格对应一个操作系统线程**（如 `new Thread()`） |
| 虚拟线程 | JDK19 引入、JDK21 正式发布，由 JVM 管理而非操作系统，**轻量级**，内存占用小 |

**虚拟线程的特点**：
- 上下文切换**无需陷入内核态**，创建和销毁成本低，**不需要池化**
- 多个虚拟线程共享同一载体平台线程
- 少量平台线程可以创建并调度**百万级虚拟线程**
- 切换时保存虚拟线程栈、程序计数器等上下文信息

**为什么需要虚拟线程？**

背景：传统模型如 Tomcat 是**一个请求对应一个线程**，一个线程处理一个请求。

问题：
1. 一个进程的线程数有限（约 6 万个），限制了并发请求数
2. 高并发下大量请求触发阻塞 I/O，造成大量线程阻塞等待
3. 最终线程资源耗尽，且 CPU 占用率不高
4. **线程资源成为系统瓶颈**

解决：
- 用虚拟线程完成阻塞 I/O 操作
- 虚拟线程阻塞时不占用平台线程（自动让出载体）
- 避免线程资源耗尽，实现**百万级并发**

```java
// 创建虚拟线程
Thread.startVirtualThread(() -> {
    System.out.println("我是虚拟线程");
});

// 使用虚拟线程池（不需要池化，但可以用 ExecutorService）
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1_000_000; i++) {
        executor.submit(() -> {
            // 模拟阻塞 I/O
            Thread.sleep(Duration.ofSeconds(1));
            return "done";
        });
    }
}
```

**当前支持情况**：Tomcat、Jetty、Netty、Spring Boot 等主流框架已支持虚拟线程。

### 平台线程 vs 虚拟线程对比

| 对比项 | 平台线程 | 虚拟线程 |
|---|---|---|
| 管理方 | 操作系统 | JVM |
| 与 OS 线程关系 | 一对一 | 多对一（多个虚拟线程共享一个平台线程） |
| 内存占用 | 大（MB 级） | 小（KB 级） |
| 创建销毁成本 | 高（系统调用） | 低 |
| 上下文切换 | 需陷入内核态 | 用户态完成 |
| 是否需要池化 | 需要（线程池） | 不需要 |
| 并发数量 | 受限（约 6 万） | 百万级 |
| 适用场景 | CPU 密集型 | I/O 密集型 |

## 相关笔记
- [[线程池工作原理]]
- [[线程池使用场景与参数设置]]

## 来源
来源：Java八股文PDF

