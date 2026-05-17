---
tags: [八股文, Java基础, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Java 反射与动态代理

## 问题
什么是反射？JDK 动态代理和 CGLIB 动态代理有什么区别？

## 答案

### 反射的定义

反射允许程序在**运行时**动态地检查、修改或调用类、方法、属性、构造函数等代码结构的信息。打破了传统"编译时绑定"的限制，适配未知或变化的类型，增加程序的灵活性和通用性。

### 反射的使用场景

1. **框架开发**：Spring 的依赖注入、AOP 的动态代理
2. **动态加载类**：插件化架构
3. **序列化/反序列化**：JSON 库将对象转为字符串
4. **测试工具**：JUnit 动态调用测试方法

### 反射的注意事项

- **性能开销**：反射操作比直接调用慢
- **安全风险**：可能破坏封装性，暴露私有逻辑
- **维护困难**：反射代码可读性差，调试复杂

### 动态代理概述

动态代理是一种在程序**运行时**（而非编译时）动态生成代理对象的技术。在不改变原始类的情况下，代理对象可以拦截对目标对象的方法调用，并在调用前后执行自定义逻辑（增强）。

### JDK 动态代理

**原理**：在运行时动态为目标类所实现的**接口**生成一个代理类（实现类），实现接口的所有方法并增强代码。

**限制**：目标类**必须实现接口**。

**调用流程**：
1. 调用代理类的方法
2. 代理类拦截调用，执行增强逻辑
3. 通过**反射**调用目标类的目标方法

**核心组件**：
- `java.lang.reflect.Proxy`：生成代理类
- `java.lang.reflect.InvocationHandler`：定义增强逻辑

```java
// JDK 动态代理示例
public interface UserService {
    void save();
}

public class UserServiceImpl implements UserService {
    @Override
    public void save() {
        System.out.println("保存用户");
    }
}

// InvocationHandler 实现
public class MyInvocationHandler implements InvocationHandler {
    private Object target;

    public MyInvocationHandler(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("前置增强");
        Object result = method.invoke(target, args); // 反射调用目标方法
        System.out.println("后置增强");
        return result;
    }
}

// 使用
UserService proxy = (UserService) Proxy.newProxyInstance(
    UserService.class.getClassLoader(),
    new Class[]{UserService.class},
    new MyInvocationHandler(new UserServiceImpl())
);
proxy.save();
```

### CGLIB 动态代理

**原理**：在运行时动态生成目标类的一个**子类**，重写父类的所有方法并增强代码。

**底层实现**：通过 ASM 字节码处理框架转换字节码并生成新类。

**限制**：目标类如果被 `final` 修饰则不能使用 CGLIB 代理（因为基于继承）。

**调用流程**：
1. 调用代理类的方法
2. 代理类拦截调用，执行增强逻辑
3. 直接调用**父类**对应的目标方法

### JDK 动态代理 vs CGLIB 对比

| 对比项 | JDK 动态代理 | CGLIB 动态代理 |
|---|---|---|
| 原理 | 基于接口生成代理类 | 基于继承生成代理类 |
| 生成代理类速度 | 快 | 慢 |
| 调用过程速度 | 涉及反射调用目标方法（略慢） | 调用父类目标方法（略快） |
| 能否代理无接口的类 | 不能 | 能 |
| 目标类限制 | 必须实现接口 | 不能被 final 修饰 |

> 注意：随着 JDK 版本升级，JDK 动态代理的调用速度不断提升，甚至可能超过 CGLIB。

### Spring 中的选择策略

Spring AOP 默认策略：
- 目标类实现了接口：优先使用 **JDK 动态代理**
- 目标类没有实现接口：使用 **CGLIB 动态代理**
- Spring Boot 2.x 默认使用 CGLIB 代理

## 相关笔记
- [[Spring AOP 设计模式与代理方式]]

## 来源
来源：Java八股文PDF

