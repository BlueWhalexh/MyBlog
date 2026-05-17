---
tags: [八股文, Java基础, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# 异常体系 — Error 与 Exception

## 问题
Error 和 Exception 有什么区别？受检异常和非受检异常是什么？throw 和 throws 的区别？finally 一定会执行吗？

## 答案

### Error vs Exception

**Error（错误）**：
- **系统级严重问题**，通常由 JVM 或底层系统资源不足引发
- 例如：`OutOfMemoryError`（内存溢出）、`StackOverflowError`（栈溢出）
- **无法通过代码恢复**，程序通常只能终止运行，一般不建议捕获处理

**Exception（异常）**：
- **程序级可处理问题**，由程序逻辑或外部输入导致
- 例如：`FileNotFoundException`、`NullPointerException`
- **可通过代码捕获和处理**：使用 try-catch 或 throws 抛出

### 受检异常 vs 非受检异常

Java 中的异常分为两大类：

**受检异常（编译时异常）**：
- 编译时即可发现，必须在代码中**显式处理**
- 可以通过捕获或声明抛出来处理
- 常见类型：
  - `IOException`：输入/输出操作异常
  - `SQLException`：数据库相关异常
  - `ClassNotFoundException`：找不到类文件
  - `InterruptedException`：线程阻塞时被打断

**非受检异常（运行时异常）**：
- 继承自 `RuntimeException`，程序运行时发生
- 编写代码时**不需要显式捕获**，但如果不捕获，运行期发生异常会中断程序
- 一般是代码原因导致的，只要代码写对就可以避免
- 常见类型：
  - `NullPointerException`：访问空引用
  - `ArrayIndexOutOfBoundsException`：数组下标越界
  - `ClassCastException`：类型转换出错
  - `OutOfMemoryError`：内存不足

### throw vs throws

| 对比项 | throw | throws |
|---|---|---|
| 作用 | 在方法内部**主动抛出**一个异常对象 | 在方法签名中**声明**可能抛出的异常 |
| 语法 | `throw new Exception("错误信息")` | `返回类型 方法名(参数) throws 异常类1, 异常类2` |
| 位置 | 方法体内 | 方法签名上 |
| 数量 | 只能抛出**一个**异常对象 | 可以声明**多个**异常类 |
| 执行效果 | 执行后方法立即**终止**，后续代码不执行 | 不影响方法执行流程 |

**throw 关键点**：
1. 后面必须跟一个异常对象（如 `new Exception()`）
2. 执行后方法立即终止
3. 可以抛出受检异常或非受检异常，抛出受检异常时必须在方法签名中用 throws 声明

**throws 关键点**：
1. 后面可以跟多个异常类，用逗号分隔
2. 调用声明了受检异常的方法时，必须用 try-catch 捕获或继续用 throws 声明
3. 非受检异常（如 `RuntimeException`）无需在 throws 中声明

### finally 一定会执行吗？

**正常情况下**，finally 中的代码一定会执行。但以下异常情况 **finally 不会执行**：

1. **`System.exit()`**：程序在 try 块中调用 `System.exit()`，立即终止程序

```java
try {
    System.out.println("执行 try 代码");
    System.exit(0);
} finally {
    System.out.println("不会执行"); // 不会输出
}
```

2. **`Runtime.getRuntime().halt()`**：强制终止正在运行的 JVM，不触发关闭序列

```java
try {
    System.out.println("执行 try 代码");
    Runtime.getRuntime().halt(0);
} finally {
    System.out.println("不会执行"); // 不会输出
}
```

3. **死循环或死锁**：try 块中遇到死循环或死锁，程序无法跳出 try 块
4. **掉电/断电**：程序还没执行到 finally 就掉电了
5. **JVM 崩溃**：JVM 异常崩溃导致程序不能继续执行

### 异常体系继承结构

```
Throwable
├── Error（不可恢复）
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── ...
└── Exception（可处理）
    ├── 受检异常（编译时异常）
    │   ├── IOException
    │   ├── SQLException
    │   ├── ClassNotFoundException
    │   └── InterruptedException
    └── RuntimeException（非受检异常/运行时异常）
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        ├── ClassCastException
        └── ...
```

## 相关笔记
- [[类加载每一步具体做了什么]]

## 来源
来源：Java八股文PDF

