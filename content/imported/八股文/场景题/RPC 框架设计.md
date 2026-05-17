---
tags: [八股文, 场景题, 面试]
source: "Java面试准备"
date: 2026-04-30
---

# RPC 框架设计

## 问题

如何设计一个 RPC（Remote Procedure Call）框架？

## 一、什么是 RPC

RPC 即远程过程调用，允许程序像调用本地方法一样调用远程服务器上的方法。使用者无需关心底层网络通信、序列化等细节。

```
本地调用：result = userService.getById(1);
RPC 调用：result = userService.getById(1); // 看起来一样，实际调用远程服务
```

## 二、核心组件

### 2.1 服务注册与发现

**问题**：服务提供者（Provider）部署在多台机器上，消费者（Consumer）如何知道要调用哪台机器？

**方案**：

```
Provider 启动时 → 向注册中心注册自己的地址
Consumer 启动时 → 从注册中心获取 Provider 地址列表
Provider 下线时 → 注册中心通知 Consumer 更新地址列表
```

**常用注册中心**：

| 注册中心 | 一致性模型 | CAP | 特点 |
|----------|-----------|-----|------|
| ZooKeeper | CP | 强一致性 | 成熟稳定，但性能一般 |
| Nacos | AP/CP 可切换 | 灵活 | 支持配置管理，阿里系 |
| Eureka | AP | 最终一致性 | Netflix 开源，简单易用 |
| Consul | CP | 强一致性 | 支持多数据中心 |

### 2.2 序列化

**问题**：Java 对象如何在网络上传输？

**常用序列化方案**：

| 序列化 | 性能 | 可读性 | 跨语言 | 适用场景 |
|--------|------|--------|--------|---------|
| JDK 原生 | 差 | 否 | 否 | 不推荐 |
| JSON | 中 | 是 | 是 | 调试方便，通用场景 |
| Hessian | 好 | 否 | 部分 | Dubbo 默认 |
| Protobuf | 极好 | 否 | 是 | 高性能、跨语言（推荐） |
| Kryo | 极好 | 否 | 否 | Java 内部使用 |
| Avro | 好 | 否 | 是 | Hadoop 生态 |

**Protobuf 示例**：

```protobuf
// user.proto
syntax = "proto3";

message UserRequest {
    int64 id = 1;
}

message UserResponse {
    int64 id = 1;
    string name = 2;
    int32 age = 3;
}

service UserService {
    rpc GetUser(UserRequest) returns (UserResponse);
}
```

### 2.3 网络通信

**方案对比**：

| 方案 | 特点 | 适用场景 |
|------|------|---------|
| BIO | 阻塞IO，一连接一线程 | 不适合高并发 |
| NIO | 非阻塞IO，多路复用 | 自研框架 |
| Netty | 基于NIO的框架 | RPC 框架首选（推荐） |
| HTTP/2 | 标准协议，多路复用 | gRPC 使用 |

**为什么选 Netty？**

1. 基于 NIO，高并发低延迟
2. 内置编解码器、心跳机制、断线重连
3. Reactor 线程模型，吞吐量高
4. Dubbo 底层就是基于 Netty

### 2.4 负载均衡

**问题**：一个服务有多个实例，调用时选择哪一个？

| 策略 | 算法 | 特点 |
|------|------|------|
| 随机（Random） | 随机选择 | 简单，适合机器配置相同 |
| 轮询（Round Robin） | 依次轮转 | 均匀分配 |
| 加权轮询 | 按权重轮转 | 适用于机器配置不同 |
| 最少连接 | 选择连接数最少的 | 动态负载均衡 |
| 一致性哈希 | 哈希取模 | 有状态服务，会话保持 |
| 最短响应时间 | 选择 RT 最短的 | 自适应，效果最好 |

### 2.5 容错机制

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| 失败重试 | 失败后重试其他实例 | 非幂等操作慎用 |
| 失败快速失败 | 立即返回错误 | 对实时性要求高 |
| 失败安全 | 忽略失败，返回空 | 日志类操作 |
| 并发调用 | 同时调多个实例，取最快返回 | 对延迟敏感 |
| 熔断降级 | 失败率过高时熔断 | 防止级联故障 |

---

## 三、完整调用流程

```
Consumer 端：
1. 调用代理对象的方法（如 userService.getById(1)）
2. 代理将方法名、参数类型、参数值封装为请求对象
3. 序列化请求对象为字节数组
4. 通过 Netty 将字节数组发送到 Provider
5. 等待 Provider 返回结果
6. 反序列化响应对象
7. 返回结果给调用方

Provider 端：
1. Netty Server 接收字节数组
2. 反序列化为请求对象
3. 根据方法名找到对应的实现类
4. 通过反射调用实际方法
5. 将返回值序列化
6. 通过 Netty 发送回 Consumer
```

---

## 四、代码实现框架

### 4.1 服务接口定义

```java
public interface UserService {
    User getUserById(long id);
}
```

### 4.2 服务注册（Provider 端）

```java
@RpcService(version = "1.0")
public class UserServiceImpl implements UserService {
    @Override
    public User getUserById(long id) {
        return userMapper.selectById(id);
    }
}
```

### 4.3 服务调用（Consumer 端）

```java
@RpcReference(version = "1.0")
private UserService userService;

public void doSomething() {
    User user = userService.getUserById(1); // 看起来像本地调用
}
```

### 4.4 核心：动态代理

```java
public class RpcProxy implements InvocationHandler {
    private Class<?> interfaceClass;
    private String serviceVersion;
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) 
            throws Throwable {
        // 1. 构建 RPC 请求
        RpcRequest request = RpcRequest.builder()
            .interfaceName(interfaceClass.getName())
            .methodName(method.getName())
            .parameterTypes(method.getParameterTypes())
            .args(args)
            .version(serviceVersion)
            .requestId(UUID.randomUUID().toString())
            .build();
        
        // 2. 服务发现
        ServiceAddress address = serviceDiscovery.discover(
            request.getInterfaceName());
        
        // 3. 发送请求并获取响应
        RpcResponse response = nettyClient.send(address, request);
        
        // 4. 处理响应
        if (response.isError()) {
            throw new RuntimeException(response.getErrorMessage());
        }
        return response.getResult();
    }
}
```

### 4.5 核心：服务端反射调用

```java
public class RpcRequestHandler {
    
    private Map<String, Object> serviceMap = new ConcurrentHashMap<>();
    
    public RpcResponse handle(RpcRequest request) {
        String key = request.getInterfaceName() + ":" + request.getVersion();
        Object serviceBean = serviceMap.get(key);
        
        if (serviceBean == null) {
            return RpcResponse.error("Service not found");
        }
        
        try {
            // 反射调用
            Class<?> clazz = serviceBean.getClass();
            Method method = clazz.getMethod(
                request.getMethodName(), request.getParameterTypes());
            method.setAccessible(true);
            Object result = method.invoke(serviceBean, request.getArgs());
            
            return RpcResponse.success(result);
        } catch (Exception e) {
            return RpcResponse.error(e.getMessage());
        }
    }
}
```

---

## 五、技术选型对比

| 框架 | 语言 | 序列化 | 通信 | 特点 |
|------|------|--------|------|------|
| Dubbo | Java | Hessian/Protobuf | Netty | 阿里系，功能全面，国内主流 |
| gRPC | 多语言 | Protobuf | HTTP/2 | Google 开源，跨语言首选 |
| Thrift | 多语言 | 自有格式 | 自有 | Facebook 开源，性能好 |
| Motan | Java | 自有 | Netty | 微博开源，轻量 |
| Spring Cloud | Java | JSON | HTTP | 全家桶，与 Spring 生态无缝集成 |

---

## 六、高级特性

### 6.1 优雅停机

Provider 下线时，先通知注册中心摘除自己，等存量请求处理完成后再关闭。

### 6.2 限流

在 Provider 端进行限流，防止被流量打垮。可以使用令牌桶或滑动窗口算法。

### 6.3 链路追踪

为每次 RPC 调用生成全局唯一的 TraceId，串联整个调用链路，便于排查问题。

### 6.4 灰度发布

根据请求参数（如用户ID）将部分流量路由到新版本实例，实现灰度发布。

## 常见追问

### Q：Dubbo 和 gRPC 怎么选？

> 1. 纯 Java 技术栈、国内项目 → Dubbo
> 2. 跨语言（Java + Go + Python）→ gRPC
> 3. 与 Spring Cloud 生态融合 → Spring Cloud + OpenFeign
> 4. 对性能要求极高 → gRPC（Protobuf + HTTP/2）

### Q：RPC 和 HTTP 调用有什么区别？

> 1. RPC 是一种设计思想，HTTP 是一种协议。RPC 可以基于 HTTP 实现（如 gRPC 基于 HTTP/2），也可以基于 TCP 自定义协议
> 2. RPC 通常使用二进制序列化（Protobuf），HTTP 通常使用 JSON，前者性能更好
> 3. RPC 有服务发现、负载均衡、熔断等治理能力，HTTP 调用需要额外实现

### Q：如何保证 RPC 调用的幂等性？

> 1. 为每个请求生成唯一 RequestId
> 2. Provider 端用 Redis 缓存已处理的 RequestId
> 3. 收到重复请求时直接返回缓存的结果

## 相关笔记
- [[BIO NIO AIO 对比]]
- [[IO多路复用 select poll epoll]]
- [[分布式 ID 生成方案]]
