---
tags: [八股文, Spring, 面试]
source: "[[todoList_detail#Day 42]]"
date: 2026-03-31
---

# Spring Boot 启动流程

## 问题
Spring Boot 的启动流程是怎样的？自动装配原理是什么？

## 答案

分五步：创建 SpringApplication → 准备环境 → 创建容器 → 刷新容器 → 回调 Runner。

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

`SpringApplication.run()` 方法内部核心流程：

```java
public ConfigurableApplicationContext run(String... args) {
    // 1. 创建 SpringApplication
    // 2. 准备环境
    // 3. 创建容器
    // 4. 刷新容器
    // 5. 回调 Runner
}
```

### 第一步：创建 SpringApplication 对象

`new SpringApplication(primarySources)` 构造函数中执行以下关键操作：

1. **判断Web应用类型**：根据classpath中是否存在`javax.servlet.Servlet`、`org.springframework.web.reactive.DispatcherHandler`等类，判断是`SERVLET`、`REACTIVE`还是`NONE`类型
2. **加载ApplicationContextInitializer**：通过`SpringFactoriesLoader`读取`META-INF/spring.factories`中`ApplicationContextInitializer`对应的实现类（如`DelegatingApplicationContextInitializer`、`SharedMetadataReaderFactoryContextInitializer`等）
3. **加载ApplicationListener**：同样通过`SpringFactoriesLoader`加载`ApplicationListener`的实现类（如`ConfigFileApplicationListener`、`AnsiOutputApplicationListener`等），用于监听启动过程中的各种事件
4. **推断主配置类**：根据`main()`方法的调用栈找到包含`main`方法的类（即标注了`@SpringBootApplication`的类）

```java
public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
    this.resourceLoader = resourceLoader;
    this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));
    this.webApplicationType = WebApplicationType.deduceFromClasspath();  // 1.判断Web类型
    setInitializers(getSpringFactoriesInstances(ApplicationContextInitializer.class));  // 2.加载Initializer
    setListeners(getSpringFactoriesInstances(ApplicationListener.class));  // 3.加载Listener
    this.mainApplicationClass = deduceMainApplicationClass();  // 4.推断主配置类
}
```

### 第二步：准备环境（prepareEnvironment）

调用`run()`方法后，首先准备运行环境：

1. **创建Environment对象**：根据Web应用类型创建`ApplicationServletEnvironment`或`ApplicationReactiveWebEnvironment`
2. **加载配置文件**：读取`application.yml`/`application.properties`、命令行参数、系统环境变量等配置源，配置到Environment中
3. **触发ApplicationEnvironmentPreparedEvent事件**：通知所有监听器环境已准备完成，`ConfigFileApplicationListener`在此阶段加载`application-{profile}.yml`配置文件
4. **绑定SpringApplication的属性**：将`spring.main.*`前缀的配置绑定到SpringApplication对象

```java
private ConfigurableEnvironment prepareEnvironment(SpringApplicationRunListeners listeners,
                                                   ApplicationArguments applicationArguments) {
    ConfigurableEnvironment environment = getOrCreateEnvironment();
    configureEnvironment(environment, applicationArguments.getSourceArgs());
    listeners.environmentPrepared(environment);  // 触发环境准备事件
    bindToSpringApplication(environment);
    return environment;
}
```

### 第三步：创建ApplicationContext容器

根据Web应用类型创建对应的ApplicationContext：

| Web应用类型 | ApplicationContext实现类 |
|------------|------------------------|
| SERVLET | `AnnotationConfigServletWebServerApplicationContext` |
| REACTIVE | `AnnotationConfigReactiveWebServerApplicationContext` |
| NONE | `AnnotationConfigApplicationContext` |

```java
protected ConfigurableApplicationContext createApplicationContext() {
    Class<?> contextClass = this.applicationContextClass;
    if (contextClass == null) {
        switch (this.webApplicationType) {
            case SERVLET:
                contextClass = AnnotationConfigServletWebServerApplicationContext.class;
                break;
            case REACTIVE:
                contextClass = AnnotationConfigReactiveWebServerApplicationContext.class;
                break;
            default:
                contextClass = AnnotationConfigApplicationContext.class;
        }
    }
    return (ConfigurableApplicationContext) BeanUtils.instantiateClass(contextClass);
}
```

同时，在此阶段还会创建`FailureAnalyzer`用于启动失败时的错误分析。

### 第四步：刷新容器（refreshContext）

这是启动流程中最核心、最复杂的步骤，调用`AbstractApplicationContext.refresh()`方法，内部包含12个子步骤：

```java
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // 1. 准备刷新：设置启动时间、活跃标志，初始化属性源
        prepareRefresh();

        // 2. 获取BeanFactory：创建DefaultListableBeanFactory，加载BeanDefinition
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

        // 3. BeanFactory预处理：注册一些特殊的Bean（如BeanPostProcessor、环境变量相关Bean）
        prepareBeanFactory(beanFactory);

        // 4. BeanFactory后置处理：子类扩展点，如Web应用中注册Scope、ServletContext相关Bean
        postProcessBeanFactory(beanFactory);

        // 5. 执行BeanFactoryPostProcessor：处理@Configuration类、@ComponentScan扫描、
        //    @Import导入、自动装配配置类加载等（自动装配在此步骤完成）
        invokeBeanFactoryPostProcessors(beanFactory);

        // 6. 注册BeanPostProcessor：注册用于Bean创建时的后置处理器
        //    如AutowiredAnnotationBeanPostProcessor处理@Autowired注入
        //    CommonAnnotationBeanPostProcessor处理@PostConstruct、@PreDestroy
        registerBeanPostProcessors(beanFactory);

        // 7. 初始化MessageSource：国际化支持
        initMessageSource();

        // 8. 初始化ApplicationEventMulticaster：事件广播器
        initApplicationEventMulticaster();

        // 9. 子类扩展：创建特殊的Bean（如Web应用中创建内嵌Tomcat/Jetty/Undertow服务器）
        onRefresh();

        // 10. 注册事件监听器：将ApplicationListener注册到事件广播器
        registerListeners();

        // 11. 实例化所有非懒加载的单例Bean（核心步骤）：
        //     创建Bean → 属性注入 → 初始化 → AOP代理 → 放入单例池
        finishBeanFactoryInitialization(beanFactory);

        // 12. 完成刷新：
        //     清除资源缓存、初始化LifecycleProcessor、
        //     发布ContextRefreshedEvent事件、注册ShutdownHook
        finishRefresh();
    }
}
```

**关键步骤详细说明**：

- **步骤5 `invokeBeanFactoryPostProcessors`**：这是自动装配发生的关键步骤。`ConfigurationClassPostProcessor`会解析`@Configuration`类，处理`@ComponentScan`（扫描组件）、`@Import`（导入配置类和`ImportSelector`）、`@Bean`（注册Bean定义）。`AutoConfigurationImportSelector`在此步骤被触发，加载`spring.factories`中的自动配置类。
- **步骤9 `onRefresh`**：对于Web应用，`ServletWebServerApplicationContext.onRefresh()`会调用`createWebServer()`创建内嵌Web服务器（Tomcat/Jetty/Undertow）。
- **步骤11 `finishBeanFactoryInitialization`**：实例化所有非懒加载的单例Bean。这是最耗时的步骤，涉及Bean的完整生命周期（实例化 → 属性注入 → 初始化 → AOP代理）。

### 第五步：回调Runner（afterRefresh）

容器刷新完成后，执行回调：

1. **调用`ApplicationRunner.run(ApplicationArguments)`**：可获取处理后的参数（选项参数和非选项参数）
2. **调用`CommandLineRunner.run(String... args)`**：获取原始命令行参数

```java
private void callRunners(ConfigurableApplicationContext context, ApplicationArguments args) {
    List<Object> runners = new ArrayList<>();
    runners.addAll(context.getBeansOfType(ApplicationRunner.class).values());
    runners.addAll(context.getBeansOfType(CommandLineRunner.class).values());
    // 排序后依次执行
    AnnotationAwareOrderComparator.sort(runners);
    for (Object runner : runners) {
        if (runner instanceof ApplicationRunner) {
            ((ApplicationRunner) runner).run(args);
        } else if (runner instanceof CommandLineRunner) {
            ((CommandLineRunner) runner).run(args.getSourceArgs());
        }
    }
}
```

可以通过`@Order`注解或实现`Ordered`接口控制多个Runner的执行顺序。

### 启动流程总结

```
main() → SpringApplication.run()
  ├── new SpringApplication()           // 构造：判断Web类型、加载Initializer和Listener
  ├── prepareEnvironment()              // 准备环境：加载配置文件
  ├── createApplicationContext()         // 创建容器
  ├── refreshContext() → refresh()      // 刷新容器（核心12步）
  │     ├── prepareRefresh()
  │     ├── obtainFreshBeanFactory()    // 创建BeanFactory
  │     ├── prepareBeanFactory()
  │     ├── postProcessBeanFactory()
  │     ├── invokeBeanFactoryPostProcessors()  // 自动装配、@ComponentScan
  │     ├── registerBeanPostProcessors()
  │     ├── initMessageSource()
  │     ├── initApplicationEventMulticaster()
  │     ├── onRefresh()                 // 创建内嵌Web服务器
  │     ├── registerListeners()
  │     ├── finishBeanFactoryInitialization()  // 实例化单例Bean
  │     └── finishRefresh()             // 发布ContextRefreshedEvent
  └── callRunners()                     // 回调Runner
```

自动装配原理：启动时读取 `META-INF/spring.factories`，加载 `EnableAutoConfiguration` 对应的配置类，根据 `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等条件判断是否生效。

## 相关笔记
- [[Spring Boot 自动装配与 Bean 生命周期]]
- [[Spring Boot 自动装配与 Bean 生命周期]]
- [[Spring Boot 自定义线程池]]

## 来源
原始记录：[[todoList_detail#Day 42 (03-31)]]

