---
tags: [八股文, Spring, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Spring IOC 与 AOP 核心概念

## 问题
什么是Spring IOC和AOP？请详细说明其核心概念、原理和应用场景。

## 答案

### IOC（控制反转）

IOC即控制反转，指的是将对象的创建和管理权从程序代码中交给了Spring容器。容器负责创建、管理和注入对象，开发者只需要接受容器注入的对象。

**核心思想**：对象的控制权从程序代码转移到外部容器（Spring容器）。

**DI（依赖注入）** 是IOC的具体实现方式，通过`@Autowired`、`@Resource`等注解，由容器自动将依赖对象注入到目标对象中。

**IOC容器管理Bean生命周期**：
1. 实例化Bean（调用构造函数）
2. 属性注入（依赖注入）
3. 初始化（调用`@PostConstruct`或`InitializingBean`）
4. 使用Bean
5. 销毁（调用`@PreDestroy`或`DisposableBean`）

**优点**：

#### 1. 降低耦合度（解耦）

传统开发中，对象之间的依赖关系是硬编码的，一个类直接 `new` 依赖的具体实现类，导致类与类之间高度耦合。IOC容器将对象的创建和依赖关系的维护从代码中抽离出来，业务类只依赖接口或抽象，不依赖具体实现。更换实现类时只需修改配置或注解，无需改动业务代码。

```java
// 传统高耦合方式：更换支付方式需要修改代码
public class OrderService {
    private PaymentProcessor paymentProcessor = new AlipayProcessor();
}

// IOC解耦方式：更换支付方式只需修改注入配置
public class OrderService {
    @Resource
    private PaymentProcessor paymentProcessor;
}
```

#### 2. 便于测试

IOC极大地方便了单元测试。由于依赖是通过注入传递的，测试时可以轻松替换为Mock对象，无需启动整个Spring容器。

```java
// 测试时可以手动注入Mock对象
@Test
public void testOrderService() {
    OrderService orderService = new OrderService();
    // 注入Mock的支付处理器，无需真实调用支付接口
    orderService.setPaymentProcessor(new MockPaymentProcessor());
    orderService.createOrder(order);
}
```

#### 3. 便于管理对象生命周期

Spring容器统一管理Bean的完整生命周期（实例化 → 属性注入 → 初始化 → 使用 → 销毁），开发者无需手动管理对象的创建和销毁。容器还支持作用域管理（单例、原型等）、懒加载、条件装配等高级特性，避免了资源泄漏和重复创建对象的开销。

#### 4. 资源复用

Spring容器中的Bean默认是单例的，避免重复创建相同对象浪费内存。容器启动时创建一次，整个应用生命周期内复用同一实例。

### AOP（面向切面编程）

AOP即面向切面编程，用作无侵入式的代码增强。将公共行为或逻辑（横切逻辑）从业务逻辑中分离，提升代码复用性和可维护性。

**核心概念**：
- **切面（Aspect）**：横切关注点的模块化（如日志、事务）
- **切点（Pointcut）**：定义哪些方法会被增强
- **通知（Advice）**：在切点执行的时机和动作（`@Before`、`@After`、`@Around`）
- **连接点（JoinPoint）**：程序执行的某个位置

**实现方式：动态代理**

AOP的核心实现原理是动态代理，在运行时动态生成代理对象，对目标方法进行增强。Spring AOP有两种代理方式：

#### JDK动态代理（基于接口）

- **原理**：基于`java.lang.reflect.Proxy`和`InvocationHandler`接口，在运行时动态创建实现了目标接口的代理类
- **要求**：目标类必须实现至少一个接口
- **实现机制**：代理类实现目标接口，方法调用被转发到`InvocationHandler.invoke()`，在其中执行增强逻辑后再调用目标方法
- **性能**：反射调用有一定的性能开销，但JDK高版本已经做了大量优化

```java
// JDK动态代理示例
public class JdkProxyDemo {
    public static void main(String[] args) {
        OrderService target = new OrderServiceImpl();
        OrderService proxy = (OrderService) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            (proxyObj, method, methodArgs) -> {
                System.out.println("前置增强：记录日志");
                Object result = method.invoke(target, methodArgs);  // 反射调用目标方法
                System.out.println("后置增强：性能统计");
                return result;
            }
        );
        proxy.createOrder();  // 调用的是代理对象的方法
    }
}
```

#### CGLIB代理（基于继承）

- **原理**：基于ASM字节码生成框架，在运行时动态生成目标类的子类，重写目标方法进行增强
- **要求**：目标类不能是`final`修饰的（因为无法被继承），目标方法不能是`final`的（因为无法被重写）
- **实现机制**：代理类继承目标类，重写目标方法，在方法中插入增强逻辑，通过`MethodInterceptor.intercept()`实现
- **性能**：CGLIB生成代理类的创建较慢（需要生成字节码），但方法调用时是直接调用，不需要反射，执行效率更高

```java
// CGLIB代理示例
public class CglibProxyDemo {
    public static void main(String[] args) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(OrderService.class);
        enhancer.setCallback((MethodInterceptor) (obj, method, methodArgs, proxy) -> {
            System.out.println("前置增强：记录日志");
            Object result = proxy.invokeSuper(obj, methodArgs);  // 调用父类（目标类）方法
            System.out.println("后置增强：性能统计");
            return result;
        });
        OrderService proxy = (OrderService) enhancer.create();
        proxy.createOrder();
    }
}
```

#### JDK Proxy vs CGLIB 对比

| 对比项 | JDK动态代理 | CGLIB代理 |
|-------|------------|----------|
| 实现方式 | 基于接口，实现目标接口生成代理类 | 基于继承，生成目标类的子类 |
| 要求 | 目标类必须实现接口 | 目标类不能是final，方法不能是final |
| 代理类创建速度 | 较快（直接生成字节码） | 较慢（需要ASM生成字节码） |
| 方法调用效率 | 反射调用，有额外开销 | 直接调用，效率更高 |
| Spring默认策略 | 实现了接口的类使用 | Spring Boot 2.x+默认使用CGLIB |

**Spring AOP选择策略**：
- Spring 5.x：目标类实现了接口 → 使用JDK动态代理；目标类未实现接口 → 使用CGLIB代理
- Spring Boot 2.x+：默认强制使用CGLIB代理（`spring.aop.proxy-target-class=true`），即使目标类实现了接口也使用CGLIB，简化代理行为的不确定性
- 也可以通过`@EnableAspectJAutoProxy(proxyTargetClass = false)`手动指定使用JDK动态代理

**应用场景**：

#### 1. 日志记录

AOP最常见的应用场景之一。通过切面统一记录方法的入参、出参、执行时间、异常信息等，无需在每个业务方法中手动编写日志代码。

```java
@Aspect
@Component
public class LogAspect {
    @Around("execution(* com.example.service..*.*(..))")
    public Object log(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        String methodName = joinPoint.getSignature().getName();
        log.info("方法[{}]开始执行，参数: {}", methodName, joinPoint.getArgs());
        Object result = joinPoint.proceed();
        log.info("方法[{}]执行完毕，耗时: {}ms，结果: {}", methodName,
                 System.currentTimeMillis() - start, result);
        return result;
    }
}
```

#### 2. 事务管理

Spring声明式事务（`@Transactional`）的本质就是AOP。通过切面在方法执行前开启事务，方法执行后根据结果提交或回滚事务，开发者无需手动编写事务管理代码。

#### 3. 权限校验

在Controller层或Service层通过切面统一拦截请求，校验用户身份、角色权限、接口访问权限等，实现无侵入式的权限控制。

```java
@Aspect
@Component
public class AuthAspect {
    @Before("@annotation(requireAuth)")
    public void checkAuth(RequireAuth requireAuth) {
        // 校验当前用户是否具备所需角色
        if (!currentUser.hasRole(requireAuth.role())) {
            throw new UnauthorizedException("权限不足");
        }
    }
}
```

#### 4. 缓存处理

通过AOP实现方法级别的缓存控制。在方法执行前检查缓存，命中则直接返回；未命中则执行方法并将结果放入缓存。Spring Cache（`@Cacheable`、`@CacheEvict`等）就是基于AOP实现的。

#### 5. 限流与熔断

通过切面实现接口限流（如令牌桶、滑动窗口算法），在方法执行前检查当前请求是否超出限流阈值，超出则直接拒绝或降级处理。常用于保护核心接口、防止系统过载。

```java
@Aspect
@Component
public class RateLimitAspect {
    @Around("@annotation(rateLimit)")
    public Object limit(ProceedingJoinPoint joinPoint, RateLimit rateLimit) {
        // 使用令牌桶或滑动窗口算法进行限流判断
        if (!rateLimiter.tryAcquire(rateLimit.permits(), rateLimit.timeout())) {
            throw new RateLimitException("请求过于频繁，请稍后重试");
        }
        return joinPoint.proceed();
    }
}
```

#### 6. 性能监控

通过切面统计方法执行耗时，发现性能瓶颈。可结合Micrometer等监控框架将指标上报到Prometheus、Grafana等监控平台。

#### 7. 参数校验与数据脱敏

在方法执行前通过切面统一校验参数合法性，或在方法返回后对敏感数据（如手机号、身份证号）进行脱敏处理。

### Spring常见注解

#### Bean定义与组件扫描注解

| 注解 | 说明 |
|------|------|
| `@Component` | 通用组件注解，标识一个类为Spring管理的Bean |
| `@Service` | 语义化注解，标识业务层组件（本质是`@Component`） |
| `@Controller` | 语义化注解，标识控制层组件（本质是`@Component`） |
| `@Repository` | 语义化注解，标识数据访问层组件，额外支持异常转换 |
| `@Configuration` | 标识配置类，类中用`@Bean`注解的方法会生成Bean |

#### 依赖注入注解

| 注解 | 说明 |
|------|------|
| `@Autowired` | 按类型自动注入，可用于构造器、方法、字段。存在多个同类Bean时需配合`@Qualifier` |
| `@Qualifier` | 配合`@Autowired`使用，按名称指定注入哪个Bean |
| `@Resource` | JSR-250规范注解，默认按名称注入，找不到再按类型注入 |
| `@Value` | 注入配置文件中的属性值，支持SpEL表达式，如`@Value("${app.name}")` |
| `@Inject` | JSR-330规范注解，按类型注入，需要引入`javax.inject`依赖 |

#### Bean配置与作用域注解

| 注解 | 说明 |
|------|------|
| `@Bean` | 在`@Configuration`类中使用，标识方法返回值为一个Bean |
| `@Scope` | 指定Bean的作用域，如`singleton`、`prototype`、`request`、`session`等 |
| `@Lazy` | 延迟初始化，第一次使用时才创建Bean |
| `@Primary` | 当存在多个同类型Bean时，优先使用被`@Primary`标记的Bean |
| `@Conditional` | 条件装配注解，根据条件决定是否创建Bean |

#### `@Conditional`家族注解

| 注解 | 说明 |
|------|------|
| `@ConditionalOnClass` | 类路径下存在指定类时生效 |
| `@ConditionalOnMissingClass` | 类路径下不存在指定类时生效 |
| `@ConditionalOnBean` | 容器中存在指定Bean时生效 |
| `@ConditionalOnMissingBean` | 容器中不存在指定Bean时生效 |
| `@ConditionalOnProperty` | 配置文件中指定属性满足条件时生效 |
| `@ConditionalOnResource` | 类路径下存在指定资源文件时生效 |

#### 生命周期注解

| 注解 | 说明 |
|------|------|
| `@PostConstruct` | Bean初始化完成后执行（JSR-250） |
| `@PreDestroy` | Bean销毁前执行（JSR-250） |

```java
@Configuration
public class AppConfig {

    @Bean
    @Scope("prototype")
    @ConditionalOnMissingBean(DataSource.class)
    public DataSource dataSource() {
        return new HikariDataSource();
    }

    @Bean
    @Lazy
    @Primary
    public UserService userService() {
        return new UserServiceImpl();
    }
}
```

## 相关笔记
- [[Spring AOP 设计模式与代理方式]]
- [[Spring Boot 自动装配与 Bean 生命周期]]

## 来源
来源：Java八股文PDF

