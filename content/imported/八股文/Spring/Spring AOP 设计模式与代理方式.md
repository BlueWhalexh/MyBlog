---
tags: [八股文, Spring, 设计模式, 面试]
source: "[[todoList_detail#Day 29]]"
date: 2026-03-14
---

# Spring AOP 设计模式与代理方式

## 问题
Spring AOP 用到了哪些设计模式？JDK 动态代理和 CGLIB 有什么区别？

## 答案

**设计模式**：
- **代理模式（Proxy Pattern）**：Spring AOP的核心
- **装饰器模式（Decorator）**：增强原有功能而不改变接口

**代理方式**：
| 代理方式 | 基于 | 适用场景 |
|----------|------|----------|
| **JDK动态代理** | 接口（InvocationHandler） | 目标类实现了接口 |
| **CGLIB** | 继承（ASM字节码生成子类） | 目标类无接口 |

**日志/上下文注入注意事项**：
| 问题 | 说明 |
|------|------|
| **内部调用失效** | `this.method()`不走代理，AOP不生效。解决：注入自身或改用AspectJ |
| **final类/方法** | CGLIB无法代理，会报错 |
| **循环依赖** | AOP代理对象可能导致循环依赖问题 |
| **性能损耗** | 每次调用都有代理开销，避免在热点路径过度使用 |

## 相关笔记
- [[Spring Boot 启动流程]]
- [[Spring Boot 自动装配与 Bean 生命周期]]

## 来源
原始记录：[[todoList_detail#Day 29 (03-14)]]
