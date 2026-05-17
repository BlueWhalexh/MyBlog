---
tags: [八股文, Java基础, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# String 为什么设计为不可变类型？

## 问题
String 为什么设计为不可变（final）类型？String 的底层数据结构？String/StringBuffer/StringBuilder 的区别？字符串常量池是什么？

## 答案

### String 底层数据类型

**JDK1.8 及之前**：底层使用 `final char[]` 存储字符串数据

```java
// JDK1.8 String 源码
public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence {
    
    private final char value[]; // char 数组，每个字符占 2 字节（16位）
    private int hash;           // 缓存的 hashCode
}
```

**JDK1.9 及之后**：底层改为 `final byte[]` + `coder`（编码标记）

```java
// JDK1.9+ String 源码
public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence {
    
    private final byte value[]; // byte 数组
    private final byte coder;   // 编码标记：LATIN1=0, UTF16=1
    private int hash;
}
```

**为什么从 char[] 改为 byte[]？**

- `char` 占 2 字节，但大多数字符串（如英文、数字、ASCII 符号）只需要 1 字节就能表示
- 改为 `byte[]` 后，对于 Latin-1 编码的字符串，每个字符只占 1 字节，**内存节省近一半**
- 对于需要 2 字节表示的字符（如中文），`coder` 标记为 UTF16，仍然使用 2 字节
- 这是一个**空间优化**，对于大量英文字符串的应用（如 Web 服务器），可显著减少内存占用

### String 类能被继承吗？

**不能**。String 类被 `final` 修饰，无法被继承。

```java
public final class String { ... } // final 修饰
```

**为什么 String 要用 final 修饰？**

1. **安全性**：String 被广泛用于核心 Java API（网络连接 URL、数据库连接、文件路径、类加载等）。如果 String 可被继承，恶意代码可以创建子类重写方法，篡改字符串内容，造成严重的安全漏洞

2. **不可变性保证**：final 修饰类，所有方法都是 final 的，无法被重写，从根本上保证了 String 的不可变性

3. **字符串常量池**：只有不可变的字符串才能安全地在常量池中共享。如果可变，修改一个引用会影响其他引用

4. **hashCode 缓存**：String 的 hashCode 被缓存（`private int hash`），因为不可变，所以 hashCode 只需计算一次。如果可变，hashCode 会失效，导致 HashMap 行为异常

### String 是不可变的如何实现？

String 的不可变性通过以下四个机制共同保证：

**1. 类被 final 修饰**：防止被继承，避免子类重写方法破坏不可变性

**2. value 数组被 final 修饰**：引用不可变，不能指向其他数组

```java
private final char value[]; // 引用不可变
```

**3. value 数组是 private 且无 setter 方法**：外部无法直接访问或修改数组内容

```java
// 没有以下方法：
public void setValue(char[] newValue) { ... }  // 不存在
public char[] getValue() { ... }               // 不存在
```

**4. 所有修改操作都返回新对象**：`substring()`、`concat()`、`replace()` 等方法都是创建新的 String 对象

```java
// concat 源码
public String concat(String str) {
    int otherLen = str.length();
    if (otherLen == 0) return this;
    // 创建新的 char 数组，复制数据
    char buf[] = Arrays.copyOf(value, len + otherLen);
    str.getChars(buf, len);
    return new String(buf, true); // 返回新对象
}
```

**注意**：虽然 String 不可变，但可以通过**反射**修改其内部 value 数组（不推荐，破坏封装性）：

```java
String s = "hello";
Field field = String.class.getDeclaredField("value");
field.setAccessible(true);
char[] value = (char[]) field.get(s);
value[0] = 'H'; // 通过反射修改，s 变成 "Hello"
```

### String 存储有长度限制吗？

String 的长度限制分为**编译期**和**运行期**两个层面：

**1. 编译期限制：65535 字节**

当使用字符串字面量（`String s = "xxx"`）时，字符串存储在 `.class` 文件的**常量池**中，受限于常量池的结构：
- 字符串常量使用 `CONSTANT_Utf8_info` 结构存储
- 该结构使用 2 字节（16位）的无符号整数表示长度
- 最大长度 = 2^16 - 1 = **65535 字节**

```java
// 编译错误：字符串字面量过长
String s = "aaa...aaa"; // 超过 65535 字节会编译失败

// 注意：中文在 UTF-8 编码中占 3 字节，所以中文字符最多约 21845 个
```

**2. 运行期限制：2^31 - 1（约 21 亿）**

运行时通过 `new String()` 或 `StringBuilder` 创建的字符串，长度受限于数组最大长度：
- Java 数组最大长度为 `Integer.MAX_VALUE` = 2^31 - 1 = **2147483647**
- `String.length()` 返回 `int` 类型，最大值也是 2^31 - 1
- 但实际上受 JVM 堆内存限制，通常远小于这个值

```java
// 运行时可以创建很长的字符串
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 100000; i++) {
    sb.append("a");
}
String s = sb.toString(); // 可以正常创建
```

### 字符串常量池与 intern() 方法

**字符串常量池**（String Pool / String Table）是 JVM 在**堆内存**中的一块特殊区域（JDK1.7 从方法区移到了堆中），用于存储字符串字面量。

**工作原理**：
- 当创建字符串字面量时，JVM 先检查常量池中是否已存在相同内容的字符串
- 如果存在，直接返回该引用（共享）
- 如果不存在，在常量池中创建新的字符串对象，然后返回引用

```java
String s1 = "abc"; // 常量池中创建 "abc"
String s2 = "abc"; // 直接引用常量池中已有的 "abc"
System.out.println(s1 == s2); // true，同一个对象

String s3 = new String("abc"); // 堆上创建新对象
System.out.println(s1 == s3); // false，不同对象
System.out.println(s1.equals(s3)); // true，内容相同
```

**intern() 方法**：
- 如果常量池中已存在相同内容的字符串，返回常量池中的引用
- 如果不存在，将该字符串添加到常量池，并返回常量池中的引用

```java
String s1 = new String("abc"); // 堆上新对象
String s2 = s1.intern();       // 返回常量池中的引用
String s3 = "abc";             // 常量池引用
System.out.println(s2 == s3);  // true
System.out.println(s1 == s3);  // false（s1 是堆上对象）
```

**JDK1.6 vs JDK1.7+ 的 intern() 区别**：
- **JDK1.6**：常量池在方法区（永久代），`intern()` 会**复制**字符串到常量池
- **JDK1.7+**：常量池在堆中，`intern()` 不再复制，而是在常量池中**记录引用**（如果堆中已有该字符串）

### String 为什么设计为不可变类型？

**1. 安全性**：String 被大量用于核心 API（数据库连接 URL、文件路径、网络地址），如果可变可能被恶意篡改导致安全问题。

**2. 线程安全**：final 修饰，创建后不可修改，天然线程安全，多线程并发读无需加锁。

**3. 哈希缓存**：String 的 hashCode() 会缓存起来，作为 HashMap 的 key 时性能极高，不用每次都计算。

```java
// String.hashCode() 源码
public int hashCode() {
    int h = hash;
    if (h == 0 && value.length > 0) {
        for (int i = 0; i < value.length; i++) {
            h = 31 * h + value[i]; // 只计算一次
        }
        hash = h; // 缓存
    }
    return h;
}
```

**4. 字符串常量池**：相同字符串共享同一个对象，节省内存。`String a = "abc"` 直接从常量池取，`new String("abc")` 会在堆上新建对象。

### String / StringBuffer / StringBuilder 对比

| 对比项 | String | StringBuffer | StringBuilder |
|--------|--------|-------------|--------------|
| **可变性** | 不可变 | 可变 | 可变 |
| **线程安全** | 天然安全（不可变） | 安全（方法加 synchronized） | 不安全 |
| **性能** | 频繁修改时最差 | 中等 | 最好 |
| **底层实现** | final char[]/byte[] | char[]（可扩容） | char[]（可扩容） |
| **使用场景** | 字符串不经常变化 | 多线程环境下的字符串拼接 | 单线程环境下的字符串拼接 |
| **引入版本** | JDK 1.0 | JDK 1.0 | JDK 1.5 |

**StringBuffer vs StringBuilder 源码对比**：

```java
// StringBuffer.append() — 加了 synchronized
@Override
public synchronized StringBuffer append(String str) {
    toStringCache = null;
    super.append(str);
    return this;
}

// StringBuilder.append() — 没有 synchronized
@Override
public StringBuilder append(String str) {
    super.append(str);
    return this;
}
```

**性能对比**（拼接 10 万次）：
- `String`：最慢，每次拼接都创建新对象，产生大量临时对象
- `StringBuffer`：较快，但 synchronized 有锁开销
- `StringBuilder`：最快，无锁开销

**最佳实践**：
```java
// 编译器优化：简单的字符串拼接会被优化为 StringBuilder
String s = "a" + "b" + "c";
// 编译后等价于：
String s = new StringBuilder().append("a").append("b").append("c").toString();

// 但在循环中拼接，编译器不会优化，需要手动使用 StringBuilder
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 100000; i++) {
    sb.append(i); // 推荐
}
String result = sb.toString();
```

## 相关笔记
- [[生产者消费者模型的实现方式]]
- [[单例模式实现要点]]
- [[深拷贝与浅拷贝]]

## 来源
来源：Java八股文PDF

