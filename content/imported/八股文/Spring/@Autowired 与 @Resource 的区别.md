---
tags: [八股文, Spring, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# @Autowired 与 @Resource 的区别

## 问题
@Autowired和@Resource有什么区别？它们的注入方式和查找顺序是什么？

## 答案

### 核心区别

两个注解都是用于实现依赖注入（DI），告诉Spring容器在创建Bean时自动注入相关依赖。

| 对比项 | @Autowired | @Resource |
|-------|-----------|----------|
| **来源** | Spring框架提供 | JDK官方提供（JSR-250） |
| **查找顺序** | 先byType（按类型），再byName（按名称） | 先byName（按名称），再byType（按类型） |
| **作用位置** | 构造器、字段、Setter方法 | 字段、Setter方法（不支持构造器） |
| **配合注解** | `@Qualifier`指定名称 | `name`/`type`参数指定 |
| **容器支持** | 仅Spring容器支持 | 所有IOC容器都支持 |

### @Autowired注入流程

1. 先按类型（byType）在Spring容器中查找匹配的Bean
2. 如果找不到或找到多个Bean，通过字段名（byName）查找
3. 配合`@Qualifier("beanName")`可显式指定Bean名称

```java
@Component("beanOne")
class BeanOne implements Bean {}

@Component("beanTwo")
class BeanTwo implements Bean {}

@Service
class Test {
    // 报错：先byType找到两个bean，再byName(bean)无法匹配
    @Autowired
    private Bean bean;

    // 成功：先byType找到两个bean，再byName确认beanOne
    @Autowired
    private Bean beanOne;

    // 成功：@Qualifier显式指定
    @Autowired
    @Qualifier("beanOne")
    private Bean bean;
}
```

### @Resource注入流程

1. 先按名称（byName）查找匹配的Bean
2. 如果找不到，再按类型（byType）查找
3. 可通过`@Resource(type = BeanOne.class)`显式指定注入方式

```java
@Component("beanOne")
class BeanOne implements Bean {}

@Component("beanTwo")
class BeanTwo implements Bean {}

@Service
class Test {
    // 报错：先byName找不到bean，再byType找到两个仍无法匹配
    @Resource
    private Bean bean;

    // 成功：先byName直接找到beanOne
    @Resource
    private Bean beanOne;

    // 成功：显式指定byType
    @Resource(type = BeanOne.class)
    private Bean bean;
}
```

### 选择建议

- 如果使用Spring框架且不考虑容器迁移，使用`@Autowired`配合`@Qualifier`
- 如果需要考虑IOC容器迁移的兼容性，使用`@Resource`（JDK标准）

## 相关笔记
- [[Spring IOC 与 AOP 核心概念]]

## 来源
来源：Java八股文PDF
