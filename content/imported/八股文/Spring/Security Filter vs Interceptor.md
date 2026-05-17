---
tags: [八股文, Spring, 面试]
source: "[[todoList_detail#Day 39]]"
date: 2026-03-24
---

# Security Filter vs Interceptor

## 问题
Filter 和 Interceptor 有什么区别？执行顺序是怎样的？

## 答案

| 组件 | 位置 | 作用范围 | 目的 |
|------|------|----------|------|
| **Filter** | Servlet 层 | 所有请求（静态资源+Controller） | 过滤请求（认证、鉴权、编码） |
| **Interceptor** | SpringMVC 层 | 仅 Controller 请求 | 拦截业务逻辑（日志、权限校验） |

**执行顺序**：Filter → Servlet → Interceptor → Controller

## 相关笔记
- [[Spring Boot 启动流程]]
- [[Spring Boot 自动装配与 Bean 生命周期]]

## 来源
原始记录：[[todoList_detail#Day 39 (03-24)]]
