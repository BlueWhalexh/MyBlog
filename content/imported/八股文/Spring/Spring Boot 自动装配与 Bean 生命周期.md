---
tags: [八股文, Spring, 面试]
source: "[[todoList_detail#Day 39]]"
date: 2026-03-24
---

# Spring Boot 自动装配与 Bean 生命周期

## 问题
Spring Boot 自动装配的原理是什么？Bean 的生命周期有哪些阶段？

## 答案

**自动装配原理**：

Spring Boot自动装配的核心目标是：根据项目引入的依赖（classpath中的类），自动配置对应的Bean和组件，开发者无需手动编写大量XML配置或`@Configuration`类。

**记忆口诀**：
```
启动读 factories，
检查依赖有没有，
条件满足就装配，
省得自己写配置。
```

**自动装配详细流程**：

#### 第一步：@SpringBootApplication 注解入口

`@SpringBootApplication`是一个组合注解，包含三个核心注解：

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration    // 标识为配置类（本质是@Configuration）
@EnableAutoConfiguration    // 开启自动装配（核心）
@ComponentScan              // 包扫描
public @interface SpringBootApplication { ... }
```

#### 第二步：@EnableAutoConfiguration 触发自动装配

`@EnableAutoConfiguration`是自动装配的核心触发器：

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigurationPackage    // 将主配置类所在包及子包注册到AutoConfigurationPackages
@Import(AutoConfigurationImportSelector.class)  // 导入自动配置选择器
public @interface EnableAutoConfiguration { ... }
```

#### 第三步：AutoConfigurationImportSelector 加载配置类

`AutoConfigurationImportSelector`实现了`ImportSelector`接口，其`selectImports()`方法负责加载所有自动配置类：

1. 调用`SpringFactoriesLoader.loadFactoryNames()`方法
2. 读取classpath下所有`META-INF/spring.factories`文件（Spring Boot 3.x改为`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`）
3. 获取`EnableAutoConfiguration`对应的全限定类名列表

```java
// spring.factories 文件内容示例
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
  org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration,\
  org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,\
  org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,\
  org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration
```

#### 第四步：@Conditional 条件过滤

加载的自动配置类并不会全部生效，每个配置类上都标注了`@Conditional`系列注解，只有满足条件的配置类才会生效：

```java
@Configuration
@ConditionalOnClass(DataSource.class)          // classpath中存在DataSource类才生效
@ConditionalOnMissingBean(DataSource.class)     // 容器中没有DataSource Bean才生效
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties properties) {
        // 自动配置数据源
        return DataSourceBuilder.create()
            .url(properties.getUrl())
            .username(properties.getUsername())
            .password(properties.getPassword())
            .build();
    }
}
```

常用的条件注解：
- `@ConditionalOnClass`：classpath中存在指定类
- `@ConditionalOnMissingClass`：classpath中不存在指定类
- `@ConditionalOnBean`：容器中存在指定Bean
- `@ConditionalOnMissingBean`：容器中不存在指定Bean（用户自定义配置优先）
- `@ConditionalOnProperty`：配置文件中指定属性满足条件
- `@ConditionalOnWebApplication`：当前是Web应用
- `@ConditionalOnNotWebApplication`：当前不是Web应用

#### 第五步：配置属性绑定

自动配置类通常会使用`@EnableConfigurationProperties`或`@ConfigurationProperties`将`application.yml`/`application.properties`中的配置绑定到Java Bean上：

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
```

**自动装配总结**：`@SpringBootApplication` → `@EnableAutoConfiguration` → `AutoConfigurationImportSelector` → `SpringFactoriesLoader`读取`META-INF/spring.factories` → 加载自动配置类 → `@Conditional`条件过滤 → 配置属性绑定 → 注册Bean到容器

**Bean 生命周期（11步）**：
```
1. 实例化（new）
2. 属性注入（@Autowired）
3. 设置 BeanName
4. 设置 BeanFactory
5. 设置 ApplicationContext
6. 前置处理（BeanPostProcessor）
7. 初始化（@PostConstruct）
8. 后置处理（AOP 代理创建）
9. 使用中（单例缓存）
10. 销毁前（@PreDestroy）
11. 销毁（DisposableBean）
```

### Bean的作用域

Spring容器支持多种Bean作用域，通过`@Scope`注解指定：

| 作用域 | 说明 | 使用场景 |
|-------|------|---------|
| `singleton` | 默认值。整个IOC容器中只有一个实例，每次获取都是同一个对象 | 无状态的Service、DAO等 |
| `prototype` | 每次获取Bean时都会创建一个新实例 | 有状态的对象，如用户会话信息 |
| `request` | 每次HTTP请求创建一个新实例，请求结束销毁 | Web应用，存储请求级别的数据 |
| `session` | 每个HTTP Session创建一个新实例，Session过期销毁 | Web应用，存储用户会话数据 |
| `application` | 每个ServletContext创建一个实例，类似singleton但限定在ServletContext范围 | Web应用，全局共享数据 |
| `websocket` | 每个WebSocket会话创建一个实例 | WebSocket应用场景 |

```java
@Component
@Scope("prototype")
public class UserContext {
    private String currentUser;
    // 每次注入都获取新实例
}

// 自定义作用域
@Component
@Scope(scopeName = "thread", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class ThreadScopeBean {
    // 每个线程一个实例
}
```

**注意事项**：
- `singleton`作用域的Bean在容器启动时就创建（除非设置`@Lazy`），`prototype`作用域的Bean在每次获取时才创建
- `singleton` Bean注入`prototype` Bean时，`prototype` Bean只会被注入一次（不会每次调用都创建新实例）。解决方案：使用`ObjectFactory<T>`、`@Lookup`注解或`ApplicationContext.getBean()`方法

### Spring中用到的设计模式

#### 1. 工厂模式（Factory Pattern）

Spring容器本身就是最大的工厂，`BeanFactory`和`ApplicationContext`负责创建和管理Bean。`FactoryBean`接口允许自定义Bean的创建逻辑。

```java
// BeanFactory - 工厂模式的核心接口
public interface BeanFactory {
    Object getBean(String name);
    <T> T getBean(Class<T> requiredType);
}

// FactoryBean - 自定义Bean创建逻辑
@Component
public class MyFactoryBean implements FactoryBean<ComplexObject> {
    @Override
    public ComplexObject getObject() throws Exception {
        return new ComplexObject();  // 自定义创建逻辑
    }
    @Override
    public Class<?> getObjectType() {
        return ComplexObject.class;
    }
}
```

#### 2. 单例模式（Singleton Pattern）

Spring中Bean默认是单例的。`DefaultSingletonBeanRegistry`通过三级缓存（`singletonObjects`、`earlySingletonObjects`、`singletonFactories`）实现单例管理，保证容器中每个Bean只有一个实例。

#### 3. 代理模式（Proxy Pattern）

Spring AOP的核心实现。通过JDK动态代理（基于接口）或CGLIB代理（基于继承）创建代理对象，实现方法增强（如事务管理、日志记录、权限校验）。

```java
// JdkDynamicAopProxy - JDK动态代理
// CglibAopProxy - CGLIB代理
// 通过ProxyFactory决定使用哪种代理方式
```

#### 4. 模板方法模式（Template Method Pattern）

Spring中大量使用模板方法模式，定义算法骨架，将某些步骤延迟到子类实现：
- `JdbcTemplate`：封装了数据库操作的流程（获取连接 → 创建Statement → 执行SQL → 处理结果 → 关闭连接），用户只需提供SQL和回调
- `RestTemplate`：封装了HTTP请求流程
- `RedisTemplate`：封装了Redis操作流程

```java
// JdbcTemplate模板方法模式示例
jdbcTemplate.query("SELECT * FROM users", (rs, rowNum) -> {
    // 用户只需关注结果集映射，连接管理等由模板处理
    return new User(rs.getLong("id"), rs.getString("name"));
});
```

#### 5. 观察者模式（Observer Pattern）

Spring事件机制就是观察者模式的实现：
- `ApplicationEvent`：事件对象
- `ApplicationListener`：事件监听器
- `ApplicationEventPublisher`：事件发布者
- `ApplicationEventMulticaster`：事件广播器

```java
// 定义事件
public class OrderCreatedEvent extends ApplicationEvent {
    private final Order order;
    public OrderCreatedEvent(Object source, Order order) {
        super(source);
        this.order = order;
    }
}

// 发布事件
@Service
public class OrderService {
    @Autowired
    private ApplicationEventPublisher publisher;

    public void createOrder(Order order) {
        // ... 创建订单逻辑
        publisher.publishEvent(new OrderCreatedEvent(this, order));
    }
}

// 监听事件
@Component
public class OrderEventListener {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        // 处理订单创建后的逻辑（如发送通知、更新库存）
    }
}
```

#### 6. 策略模式（Strategy Pattern）

Spring中多处使用策略模式，根据条件选择不同的策略执行：
- `HandlerMapping`：根据请求选择不同的Handler映射策略
- `HandlerAdapter`：根据Handler类型选择不同的适配器策略
- `InstantiationStrategy`：Bean实例化策略（`SimpleInstantiationStrategy` vs `CglibSubclassingInstantiationStrategy`）
- `Resource`接口：不同的资源加载策略（`ClassPathResource`、`FileSystemResource`、`UrlResource`等）

#### 7. 适配器模式（Adapter Pattern）

Spring MVC中的`HandlerAdapter`就是典型的适配器模式。不同类型的Controller（`@RequestMapping`注解方法、`Controller`接口、`HttpRequestHandler`接口）通过不同的HandlerAdapter适配为统一的调用方式：

```java
// HandlerAdapter接口
public interface HandlerAdapter {
    boolean supports(Object handler);           // 判断是否支持该Handler
    ModelAndView handle(HttpServletRequest request,
                       HttpServletResponse response,
                       Object handler) throws Exception;  // 适配执行
}
```

#### 8. 装饰器模式（Decorator Pattern）

Spring中`BeanWrapper`对Bean属性的访问就是装饰器模式的应用。`HttpServletRequestWrapper`也是装饰器模式的体现。

## 相关笔记
- [[Spring Boot 启动流程]]
- [[Security Filter vs Interceptor]]

## 来源
原始记录：[[todoList_detail#Day 39 (03-24)]]
