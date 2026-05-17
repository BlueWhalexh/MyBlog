---
tags: [八股文, Spring, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Spring 事务管理机制

## 问题
Spring事务管理有哪些方式？@Transactional注解的原理是什么？事务传播行为有哪些？什么情况下事务会失效？

## 答案

### 事务管理方式

**编程式事务**：在代码中手动管理事务的开启、提交、回滚等操作，基于`PlatformTransactionManager`、`TransactionTemplate`等API。

**声明式事务**：使用`@Transactional`注解，基于AOP实现。本质是在目标方法执行前后进行拦截，执行前开启事务，执行后根据情况提交或回滚。

声明式事务对代码没有侵入性，方法内只需写业务逻辑即可。

### @Transactional原理

声明式事务建立在AOP之上，本质是通过AOP功能对加了`@Transactional`注解的方法前后进行拦截：
1. 执行目标方法前开启事务
2. 执行目标方法
3. 执行完目标方法后根据执行情况提交或回滚事务

**局限性**：最小粒度作用在方法上，若要给代码块加事务，需将其独立为方法。

### 事务传播行为（7种）

| 传播行为 | 说明 |
|---------|------|
| REQUIRED | 默认值，如果当前存在事务则加入，否则创建新事务 |
| SUPPORTS | 如果当前存在事务则加入，否则以非事务方式运行 |
| MANDATORY | 如果当前存在事务则加入，否则抛出异常 |
| REQUIRES_NEW | 无论当前是否存在事务，都创建新事务 |
| NOT_SUPPORTED | 以非事务方式运行，如果当前存在事务则挂起 |
| NEVER | 以非事务方式运行，如果当前存在事务则抛出异常 |
| NESTED | 如果当前存在事务则创建嵌套事务，否则创建新事务 |

### 事务失效的常见原因

1. **非public方法**：`@Transactional`基于动态代理实现，private方法通过`this`调用不走代理对象，事务失效

2. **final/static方法**：AOP通过创建代理对象实现，无法对final方法进行子类化和覆盖，static方法属于类而非对象，无法被AOP拦截

3. **异常被catch捕获**：异常被捕获后无法基于异常进行rollback，导致事务失效

```java
public class MyService {
    @Transactional
    public void doSomething() {
        try {
            doInternal();
        } catch (Exception e) {
            logger.error(e); // 异常被捕获，事务失效
        }
    }
}
```

4. **事务中使用多线程**：`@Transactional`使用ThreadLocal机制存储事务上下文，ThreadLocal是线程隔离的，新线程中的操作不会被包含在原有事务中

5. **rollbackFor设置错误**：默认只对RuntimeException回滚，非RuntimeException异常不会回滚。需指定`rollbackFor = Exception.class`

### Spring Boot如何优雅停机

#### 什么是优雅停机

优雅停机（Graceful Shutdown）是指在应用关闭时，先停止接收新的请求，等待正在处理的请求执行完毕后再关闭应用。避免强制终止导致正在执行的事务中断、数据不一致等问题。

#### Spring Boot 2.3+ 优雅停机配置

Spring Boot 2.3版本开始内置支持优雅停机，通过配置即可启用：

```yaml
# application.yml
server:
  shutdown: graceful  # 开启优雅停机（默认是immediate强制停机）

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s  # 停机等待超时时间（默认30秒）
```

**工作原理**：
1. 接收到停机信号（SIGTERM）后，Spring Boot触发`ContextClosedEvent`事件
2. 内嵌Web服务器（如Tomcat）停止接收新的连接和请求
3. 等待正在处理的请求在超时时间内完成
4. 超时后强制关闭，或所有请求处理完毕后正常关闭
5. 执行`@PreDestroy`和`DisposableBean.destroy()`进行资源清理

#### 信号处理

操作系统发送SIGTERM信号触发停机：

```bash
# Linux/Mac：发送SIGTERM信号
kill -15 <pid>    # 或 kill <pid>

# Windows：Ctrl+C 或 taskkill
taskkill /PID <pid>
```

**注意**：`kill -9`（SIGKILL）是强制终止，不会触发优雅停机。开发和部署时应使用`kill -15`。

#### 自定义停机逻辑

可以通过`@PreDestroy`、`DisposableBean`、`ShutdownHook`等方式自定义停机前的清理逻辑：

```java
@Component
public class GracefulShutdownHandler {

    @PreDestroy
    public void onShutdown() {
        // 关闭线程池、释放连接池、保存状态等
        log.info("应用即将关闭，执行清理操作...");
    }
}
```

#### 与K8s配合

在Kubernetes中，Pod删除时会先发送SIGTERM，配合`terminationGracePeriodSeconds`（默认30秒）使用：

```yaml
# k8s deployment.yaml
spec:
  terminationGracePeriodSeconds: 60  # K8s等待时间应大于Spring Boot的超时时间
  containers:
    - name: my-app
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 5"]  # 留出时间让Service摘除Pod
```

### Spring 6.0新特性

Spring Framework 6.0（2022年11月发布）是一个重要的大版本升级，带来了多项重大变化：

#### 1. 基线升级：JDK 17+

- **最低JDK版本从JDK 8提升到JDK 17**：Spring 6.0要求JDK 17或更高版本
- 可以使用JDK 17的新特性：Record类、Pattern Matching、Sealed Classes、Text Blocks等
- 这是最具破坏性的变更，意味着使用Spring 6.0必须升级JDK

#### 2. Jakarta EE 9+ 迁移

- **包名从`javax.*`迁移到`jakarta.*`**：这是Jakarta EE 9的核心变更
- 影响所有Servlet、JPA、Bean Validation等API的import语句
- 例如：`javax.servlet.http.HttpServletRequest` → `jakarta.servlet.http.HttpServletRequest`
- `javax.persistence.Entity` → `jakarta.persistence.Entity`

```java
// Spring 5.x
import javax.servlet.http.HttpServletRequest;
import javax.persistence.Entity;

// Spring 6.0
import jakarta.servlet.http.HttpServletRequest;
import jakarta.persistence.Entity;
```

#### 3. GraalVM Native Image 支持

- **原生编译支持**：Spring 6.0与Spring Boot 3.0配合，支持将应用编译为GraalVM Native Image
- 启动时间从秒级降低到毫秒级，内存占用大幅减少
- 适用于Serverless、FaaS等对启动速度敏感的场景
- 通过`spring-boot-maven-plugin`或`native-build-tools`插件实现

```xml
<!-- Maven配置 -->
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
</plugin>
```

**限制**：Native Image编译需要处理反射、动态代理、资源加载等的提前配置，部分第三方库可能不兼容。

#### 4. 可观测性改进（Observability）

Spring 6.0引入了统一的可观测性抽象层`Micrometer Observation API`：

- **Metrics（指标）**：集成Micrometer，支持Prometheus、Datadog等监控系统
- **Tracing（链路追踪）**：集成Micrometer Tracing（替代Spring Cloud Sleuth），支持Zipkin、Jaeger等
- **Logging（日志）**：支持结构化日志，关联TraceId和SpanId

```java
// 使用Observation API
@Component
public class MyService {
    private final ObservationRegistry observationRegistry;

    public void doSomething() {
        Observation.createObservation("my.operation", observationRegistry)
            .observe(() -> {
                // 业务逻辑，自动记录指标和链路追踪
            });
    }
}
```

#### 5. HTTP接口客户端

Spring 6.0新增了声明式HTTP接口客户端（类似Feign），通过`@HttpExchange`注解定义HTTP接口：

```java
@HttpExchange("/api/users")
public interface UserClient {
    @GetExchange("/{id}")
    User getUser(@PathVariable Long id);

    @PostExchange
    User createUser(@RequestBody User user);
}

// 注入使用
@RestController
public class UserController {
    @Autowired
    private UserClient userClient;
}
```

#### 6. 其他重要变化

- **Spring MVC支持RFC 7807 Problem Details**：标准化的错误响应格式
- **`@HttpExchange`**：替代`RestTemplate`的声明式HTTP客户端
- **虚拟线程支持**（配合JDK 21+）：Project Loom虚拟线程集成
- **移除大量已废弃的API**：清理历史包袱，代码更精简
- [[Spring IOC 与 AOP 核心概念]]

## 来源
来源：Java八股文PDF
