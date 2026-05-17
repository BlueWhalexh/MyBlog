---
tags: [八股文, Spring, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Spring MVC 请求执行流程

## 问题
请描述Spring MVC的请求处理流程，以及@Controller和@RestController的区别。

## 答案

### Spring MVC请求执行流程

```
用户请求 → DispatcherServlet → HandlerMapping → HandlerInterceptor → HandlerAdapter → Controller → 返回ModelAndView → ViewResolver → View渲染 → 响应客户端
```

**完整详细步骤**：

#### 第一步：用户发送请求

用户通过浏览器或客户端发送HTTP请求到服务器，请求首先被Servlet容器（如Tomcat）接收，根据`web.xml`或自动配置的URL映射规则，交给`DispatcherServlet`处理。

#### 第二步：DispatcherServlet接收请求

`DispatcherServlet`是Spring MVC的核心前端控制器（本质是一个HttpServlet），它继承自`FrameworkServlet`，负责统一接收所有请求并分发给对应的处理器。在初始化时会加载Spring容器中配置的`HandlerMapping`、`HandlerAdapter`、`ViewResolver`等组件。

#### 第三步：HandlerMapping查找处理器

`DispatcherServlet`调用`HandlerMapping`（处理器映射器），根据请求URL查找对应的Handler（处理器，即Controller中的方法）。常见的HandlerMapping实现：
- `RequestMappingHandlerMapping`：处理`@RequestMapping`注解映射
- `SimpleUrlHandlerMapping`：基于URL配置的简单映射
- `BeanNameUrlHandlerMapping`：根据Bean名称映射

`HandlerMapping`返回一个`HandlerExecutionChain`对象，包含：
- **Handler**：具体的处理器对象
- **HandlerInterceptor[]**：拦截器数组

#### 第四步：HandlerInterceptor前置拦截

在真正执行Handler之前，会依次执行`HandlerExecutionChain`中所有`HandlerInterceptor`的`preHandle()`方法。如果任何一个拦截器返回`false`，请求被拦截，后续流程不再执行。

```java
public interface HandlerInterceptor {
    // 前置处理：在Handler执行之前调用，返回false则中断流程
    boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler);
    // 后置处理：在Handler执行之后、视图渲染之前调用
    void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView);
    // 完成处理：在视图渲染完成后调用（无论是否异常）
    void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex);
}
```

典型应用场景：登录校验、权限检查、日志记录、性能监控。

#### 第五步：HandlerAdapter适配并执行Handler

`DispatcherServlet`调用`HandlerAdapter`（处理器适配器），通过适配器模式调用具体的Handler。不同类型的Handler需要不同的适配器：
- `RequestMappingHandlerAdapter`：适配`@RequestMapping`注解的方法
- `HttpRequestHandlerAdapter`：适配`HttpRequestHandler`接口
- `SimpleControllerHandlerAdapter`：适配`Controller`接口

`HandlerAdapter`的`handle()`方法执行Handler（即Controller方法），处理参数解析（`@RequestParam`、`@RequestBody`、`@PathVariable`等）、数据绑定、返回值处理等。

#### 第六步：Controller执行业务逻辑

Handler（Controller方法）执行具体的业务逻辑，调用Service层、DAO层等完成业务处理，返回结果。

#### 第七步：返回处理结果

根据返回类型的不同，处理方式也不同：
- **返回`ModelAndView`**：包含视图名称和模型数据，进入视图解析流程
- **返回`@ResponseBody`标注的方法**：通过`HttpMessageConverter`（如`MappingJackson2HttpMessageConverter`）将返回值序列化为JSON/XML，直接写入响应体，跳过视图解析
- **返回`String`**：作为视图名称，进入视图解析流程
- **返回`void`**：直接响应，不做额外处理

#### 第八步：HandlerInterceptor后置拦截

Handler执行完毕后，逆序执行所有`HandlerInterceptor`的`postHandle()`方法。可以对`ModelAndView`进行修改。

#### 第九步：ViewResolver解析视图

`DispatcherServlet`将`ModelAndView`传给`ViewResolver`（视图解析器），将逻辑视图名解析为具体的`View`对象。常见的ViewResolver：
- `InternalResourceViewResolver`：解析JSP视图
- `ThymeleafViewResolver`：解析Thymeleaf模板
- `FreeMarkerViewResolver`：解析FreeMarker模板

#### 第十步：View渲染视图

`View`对象将模型数据渲染到视图模板中（如将数据填充到JSP/HTML模板），生成最终的HTML内容。

#### 第十一步：响应返回客户端

渲染后的结果通过`HttpServletResponse`返回给客户端。`HandlerInterceptor`的`afterCompletion()`方法最后执行，用于资源清理。

**核心组件说明**：
- **DispatcherServlet**：前端控制器，统一接收请求并分发给各组件，是整个流程的调度中心
- **HandlerMapping**：维护URL到Handler的映射关系，根据请求找到对应的处理器
- **HandlerInterceptor**：拦截器，在Handler执行前后进行拦截处理
- **HandlerAdapter**：适配器，适配不同类型的Handler并执行
- **ViewResolver**：视图解析器，将逻辑视图名解析为具体的View对象
- **View**：视图对象，负责渲染视图并返回给客户端
- **HandlerExceptionResolver**：异常解析器，处理Handler执行过程中抛出的异常

### @Controller vs @RestController

| 对比项 | @Controller | @RestController |
|--------|-------------|-----------------|
| 注解定义 | 标识控制器类 | `@Controller` + `@ResponseBody`的组合注解 |
| 方法返回值 | 默认作为视图名称，通过ViewResolver解析渲染 | 直接将返回值序列化为JSON/XML写入响应体 |
| 需要@ResponseBody | 需要在每个方法上单独添加`@ResponseBody`注解 | 不需要，类级别已自动添加 |
| 适用场景 | 返回页面视图（如JSP、Thymeleaf模板） | 纯API接口开发（前后端分离） |
| Content-Type | 默认`text/html` | 默认`application/json` |

**源码分析**：

```java
// @RestController的源码定义
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Controller
@ResponseBody  // 自动添加了@ResponseBody
public @interface RestController {
    @AliasFor(annotation = Controller.class)
    String value() default "";
}
```

**使用示例对比**：

```java
// @Controller：返回视图页面
@Controller
@RequestMapping("/user")
public class UserController {
    @GetMapping("/list")
    public String list(Model model) {
        model.addAttribute("users", userService.findAll());
        return "user/list";  // 返回视图名称，解析为 /WEB-INF/views/user/list.jsp
    }

    @GetMapping("/api/{id}")
    @ResponseBody  // 需要单独添加@ResponseBody才能返回JSON
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }
}

// @RestController：直接返回JSON
@RestController
@RequestMapping("/api/user")
public class UserApiController {
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {  // 自动返回JSON
        return userService.findById(id);
    }
}
```

**实际开发建议**：
- 前后端分离项目：统一使用`@RestController`，所有接口返回JSON
- 传统MVC项目（如Spring MVC + Thymeleaf/JSP）：使用`@Controller`
- 混合场景：使用`@Controller`，需要返回JSON的方法单独加`@ResponseBody`

### 相关注解

- `@RequestMapping`：映射请求路径，可定义在类和方法上
- `@RequestBody`：接收HTTP请求的JSON数据，转换为Java对象
- `@RequestParam`：指定请求参数名称
- `@PathVariable`：从请求路径中获取请求参数
- `@ResponseBody`：将方法返回值转换为JSON响应给客户端
- `@RequestHeader`：获取指定的请求头数据

## 相关笔记
- [[Spring Boot 启动流程]]

## 来源
来源：Java八股文PDF

