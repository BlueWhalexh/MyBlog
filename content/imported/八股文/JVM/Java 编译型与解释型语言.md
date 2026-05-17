---
tags: [八股文, JVM, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Java 编译型与解释型语言

## 问题
Java 是编译型语言还是解释型语言？编译期和运行期分别做了什么？JIT 编译器的工作原理是什么？

## 答案

### Java 是编译型还是解释型？

**Java 既不是纯粹的编译型语言，也不是纯粹的解释型语言，而是混合型语言。**

- **编译型语言**（如 C/C++）：源代码直接编译为**机器码**，由 CPU 直接执行。编译一次，到处运行机器码。
- **解释型语言**（如 Python/JavaScript）：源代码由解释器**逐行解释执行**，不生成独立的可执行文件。
- **Java（混合型）**：源代码先**编译**为字节码（.class），再由 JVM **解释执行**字节码，热点代码由 JIT 编译器编译为**本地机器码**。

```
Java 源代码 (.java)
       │
       ▼  javac 编译器（编译期）
字节码 (.class)
       │
       ▼  JVM（运行期）
  ┌────┴────┐
  ▼         ▼
解释执行   JIT 编译为机器码
（逐条执行）  （热点代码，缓存复用）
```

### 编译期：javac 将 .java 编译为 .class 字节码

**编译期**由 `javac` 编译器完成，将 Java 源代码编译为**平台无关的字节码**（Bytecode）。

**编译过程**：

```
.java 源文件
    │
    ▼
词法分析（Lexical Analysis）
    │  将源代码拆分为一个个 Token（关键字、标识符、运算符等）
    ▼
语法分析（Syntax Analysis）
    │  将 Token 序列组织成语法树（AST，抽象语法树）
    ▼
语义分析（Semantic Analysis）
    │  检查类型匹配、变量声明、作用域等
    ▼
字节码生成（Code Generation）
    │  将 AST 转换为 JVM 字节码指令
    ▼
.class 文件（字节码）
```

**字节码的特征**：
- 平台无关：同一份 .class 文件可以在任何平台的 JVM 上运行
- 面向栈的指令集：字节码使用操作数栈进行计算（不同于 x86 的寄存器指令集）
- 由单字节操作码 + 操作数组成

```java
// Java 源代码
public int add(int a, int b) {
    return a + b;
}

// 编译后的字节码（javap -c 查看）
public int add(int, int);
    Code:
       0: iload_1    // 将局部变量表中下标1的int值（a）压入操作数栈
       1: iload_2    // 将局部变量表中下标2的int值（b）压入操作数栈
       2: iadd       // 弹出栈顶两个int值相加，结果压入栈
       3: ireturn    // 返回栈顶的int值
```

### 运行期：JVM 解释执行 + JIT 编译

**运行期**由 JVM 完成，分为两个阶段：

#### 1. 解释执行（Interpretation）

JVM 的**解释器**（Interpreter）逐条读取字节码指令并执行。

**特点**：
- 启动速度快（不需要编译，直接执行）
- 执行速度慢（每条指令都需要解释）
- 适合**冷代码**（只执行几次的代码）

```java
// 解释器的工作流程
for (bytecode : classFile) {
    switch (bytecode) {
        case ILOAD_1:  // 加载局部变量1到操作数栈
            stack.push(localVars[1]);
            break;
        case ILOAD_2:  // 加载局部变量2到操作数栈
            stack.push(localVars[2]);
            break;
        case IADD:     // 两数相加
            int b = stack.pop();
            int a = stack.pop();
            stack.push(a + b);
            break;
        case IRETURN:  // 返回
            return stack.pop();
    }
}
```

#### 2. JIT 编译（Just-In-Time Compilation）

JVM 内置的 **JIT 编译器**会将**热点代码**（Hot Spot Code，被频繁执行的代码）编译为**本地机器码**，缓存起来后续直接执行。

**特点**：
- 启动速度慢（需要编译热点代码）
- 执行速度快（直接执行机器码，无需解释）
- 适合**热代码**（被频繁执行的代码）

```java
// JIT 编译后直接执行机器码
// 之前：解释器逐条执行字节码
// 之后：直接执行编译好的机器码（如 x86 的 add 指令）
```

**热点代码的判定**：
- **方法调用计数器**：方法被调用的次数超过阈值（Client 模式 1500 次，Server 模式 10000 次）
- **回边计数器**：循环体执行的次数超过阈值

```bash
# 查看热点代码
-XX:+PrintCompilation

# 设置方法调用计数器阈值
-XX:CompileThreshold=10000

# 设置回边计数器阈值
-XX:OnStackReplacePercentage=140
```

### JIT 编译器工作原理

JVM 中有两个 JIT 编译器：

#### C1 编译器（Client Compiler）

- **目标**：快速编译，较少的优化
- **优化级别**：基本优化（方法内联、常量折叠、死代码消除等）
- **适用场景**：客户端应用，启动速度要求高
- **编译速度**：快
- **代码质量**：中等

#### C2 编译器（Server Compiler）

- **目标**：深度优化，生成高质量的机器码
- **优化级别**：高级优化（逃逸分析、标量替换、循环展开、内联缓存等）
- **适用场景**：服务器端应用，运行时间长
- **编译速度**：慢
- **代码质量**：高

**C1 vs C2 对比**：

| 对比项 | C1 编译器 | C2 编译器 |
|--------|----------|----------|
| 目标 | 快速编译 | 深度优化 |
| 优化级别 | 基本优化 | 高级优化 |
| 编译速度 | 快 | 慢 |
| 生成代码质量 | 中等 | 高 |
| 适用场景 | 客户端 | 服务器端 |
| 代表优化 | 方法内联、常量折叠 | 逃逸分析、标量替换 |

#### 分层编译（Tiered Compilation）

JDK 8 默认使用**分层编译**，结合 C1 和 C2 的优势：

```
字节码执行
    │
    ▼
第0层：解释执行（收集性能数据）
    │
    ▼  调用次数达到阈值
第1层：C1 编译（简单优化，快速编译）
    │
    ▼  调用次数继续增加
第2层：C1 编译（带性能监控的优化）
    │
    ▼  调用次数继续增加
第3层：C1 编译（带完整性能监控）
    │
    ▼  调用次数达到更高阈值
第4层：C2 编译（深度优化，生成高质量机器码）
```

**分层编译的优势**：
- 启动初期用 C1 快速编译，保证启动速度
- 运行一段时间后用 C2 深度优化，保证运行效率
- C1 编译的性能数据可以帮助 C2 做出更好的优化决策

```bash
# 开启分层编译（JDK 8 默认开启）
-XX:+TieredCompilation

# 关闭分层编译
-XX:-TieredCompilation

# 只使用 C2 编译器
-XX:+TieredCompilation -XX:TieredStopAtLevel=4
```

**分层编译的执行流程**：

```
方法被调用
    │
    ▼
解释执行（收集调用计数、分支概率等信息）
    │
    ▼ 调用计数达到阈值
C1 编译（快速编译 + 基本优化 + 继续收集性能数据）
    │
    ▼ 热度继续升高
C2 编译（深度优化，使用 C1 收集的性能数据指导优化）
    │
    ▼
直接执行编译后的机器码（不再解释执行）
```

### JIT 编译器的优化手段

**1. 方法内联（Method Inlining）**：
```java
// 优化前
public int square(int x) {
    return multiply(x, x);
}
public int multiply(int a, int b) {
    return a * b;
}

// 优化后（内联 multiply）
public int square(int x) {
    return x * x; // 直接内联，消除方法调用开销
}
```

**2. 逃逸分析 + 栈上分配**：
```java
// 优化前
public int calculate() {
    Point p = new Point(1, 2); // 堆上分配
    return p.x + p.y;
}

// 优化后（栈上分配，无需 GC）
public int calculate() {
    return 1 + 2; // 直接替换为标量
}
```

**3. 循环展开（Loop Unrolling）**：
```java
// 优化前
for (int i = 0; i < 4; i++) {
    sum += arr[i];
}

// 优化后（减少循环判断次数）
sum += arr[0];
sum += arr[1];
sum += arr[2];
sum += arr[3];
```

**4. 常量折叠（Constant Folding）**：
```java
// 优化前
int x = 3 + 5;

// 优化后
int x = 8; // 编译期直接计算
```

**5. 死代码消除（Dead Code Elimination）**：
```java
// 优化前
if (false) {
    System.out.println("永远不会执行");
}

// 优化后：整个 if 块被删除
```

### Java 程序的完整执行流程

```
Java 源代码 (.java)
       │
       ▼  1. javac 编译
字节码 (.class)
       │
       ▼  2. 类加载
类加载器加载到方法区
       │
       ▼  3. 解释执行
JVM 解释器逐条执行字节码
       │
       ▼  4. JIT 编译（热点代码）
编译为本地机器码并缓存
       │
       ▼  5. 直接执行机器码
CPU 直接执行（不再经过解释器）
```

## 相关笔记
- [[JVM 内存结构与运行时数据区]]
- [[类的生命周期]]
- [[JVM 逃逸分析与栈上分配]]

## 来源
来源：Java八股文PDF
