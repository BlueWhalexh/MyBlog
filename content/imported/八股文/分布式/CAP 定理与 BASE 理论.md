---
tags: [八股文, 分布式, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# CAP 定理与 BASE 理论

## 问题
什么是CAP定理？什么是BASE理论？分布式系统如何在一致性和可用性之间做取舍？微服务调用链如何追踪？负载均衡算法有哪些？

## 答案

### CAP定理

CAP定理指出：一个分布式系统最多只能同时满足以下三项中的两项：

- **C（Consistency，一致性）**：每次读取都会收到最新的写入数据或错误信息（强一致性）
- **A（Availability，可用性）**：每个请求都会收到响应（非错误），但不能保证响应包含最新数据
- **P（Partition Tolerance，分区容错性）**：发生网络分区或节点故障时，系统仍能继续运行

**核心结论**：在网络分区发生时，必须在一致性（C）和可用性（A）之间二选一。

### 分区容错性（P）

分区容错性是分布式系统的"生存底线"。网络分区指由于网络故障导致部分节点之间无法通信，系统被分割成多个独立子网络。

### CP系统 vs AP系统

| 类型 | 特点 | 典型系统 | 场景 |
|------|------|---------|------|
| **CP系统** | 分区发生时优先保证一致性，牺牲可用性 | ZooKeeper、HBase | 金融、支付系统 |
| **AP系统** | 分区发生时优先保证可用性，牺牲一致性 | Redis、Eureka | 社交、内容系统 |

**CP系统示例**：ZooKeeper主节点发现无法与多数节点通信时，停止写入服务（牺牲可用性），避免数据不一致。

**AP系统示例**：Redis允许每个分区继续接受读写请求（牺牲一致性），后续再恢复数据一致。

### 可用性指标

| 可用水平 | 年可容忍停机时间 |
|---------|----------------|
| 99.9999% | < 1分钟 |
| 99.999% | < 5分钟 |
| 99.99% | < 53分钟 |
| 99.9% | < 8.8小时 |
| 99% | < 3.65天 |

**实现高可用的手段**：冗余设计（多节点部署）、负载均衡、熔断机制。

### BASE理论

BASE理论是对CAP理论的延伸，强调通过放松一致性要求，换取高可用性和良好性能：

- **BA（Basically Available，基本可用）**：系统出现故障时仍能用，但可能有损失
  - 响应时间损失：正常0.5秒，故障时2秒
  - 功能损失：大促期间部分用户被引导到降级页面

- **S（Soft State，软状态）**：允许系统数据存在中间状态，不同节点的数据副本可以暂时不一致

- **E（Eventual Consistency，最终一致性）**：经过一段时间后，所有节点的数据副本最终达到一致。时间期限取决于网络延时、系统负载、数据复制方案等

### CAP与BASE的关系

- CAP的一致性是**强一致性**
- BASE的一致性是**最终一致性**
- BASE理论认为无法做到强一致性，但可以通过适当方式达到最终一致性

### 实际应用选择

- **金融、支付系统**：选择CP，数据一致性优先
- **社交、内容系统**：选择AP，可用性优先，允许短暂的数据不一致

---

### 微服务调用链日志追踪分析

在微服务架构中，一个用户请求可能经过多个服务的调用链。当出现问题时，需要追踪整个调用链路来定位问题。

#### 为什么需要调用链追踪

- 微服务架构中，一个请求可能经过 10+ 个服务
- 出现延迟或错误时，难以定位是哪个服务的问题
- 需要了解请求的完整路径、每个环节的耗时、错误信息

#### 核心概念

- **Trace（链路）**：一个完整的请求链路，从用户发起请求到最终响应
- **Span（跨度）**：链路中的一个操作单元（如一次 HTTP 调用、一次数据库查询）
- **TraceId**：全局唯一标识，贯穿整个调用链
- **SpanId**：标识链路中的单个操作
- **ParentSpanId**：标识父 Span，形成树形结构

```
TraceId: abc-123
├── SpanId: 1 (网关) ──────────────── 50ms
│   ├── SpanId: 2 (用户服务) ──────── 20ms
│   └── SpanId: 3 (订单服务) ──────── 30ms
│       ├── SpanId: 4 (库存服务) ──── 10ms
│       └── SpanId: 5 (支付服务) ──── 15ms
```

#### 主流追踪方案

**1. SkyWalking**
- Apache 开源的 APM（应用性能管理）工具
- **特点**：
  - Java Agent 字节码增强，无代码侵入
  - 支持自动埋点（Dubbo、Spring Cloud、gRPC、JDBC 等）
  - 提供服务拓扑图、链路追踪、告警等功能
  - 支持多种存储后端（Elasticsearch、H2、MySQL、TiDB）
- **使用方式**：启动时添加 `-javaagent:skywalking-agent.jar` 参数
- **UI 展示**：服务拓扑图、调用链详情、慢查询分析、告警

**2. Zipkin**
- Twitter 开源的分布式追踪系统
- **特点**：
  - 轻量级，易于部署
  - 与 Spring Cloud Sleuth 集成良好
  - 支持多种传输方式（HTTP、Kafka、RabbitMQ）
- **使用方式**：引入 Spring Cloud Sleuth 依赖，自动注入 TraceId 到日志

**3. ELK（Elasticsearch + Logstash + Kibana）**
- 日志收集、存储、分析平台
- **调用链追踪方式**：
  - 在日志中打印 TraceId（通过 MDC 或 ThreadLocal）
  - 使用 ELK 的日志聚合功能，按 TraceId 搜索和分析
- **优势**：不仅用于链路追踪，还用于日志分析、监控告警

**4. Jaeger**
- Uber 开源的分布式追踪系统，兼容 OpenTracing 标准
- **特点**：支持 OpenTracing/OpenTelemetry 标准，云原生友好

#### TraceId 传递实现

在 Java 微服务中，TraceId 的传递通常通过以下方式：

1. **HTTP Header 传递**：在 HTTP 请求头中添加 `X-Trace-Id`、`X-Span-Id` 等字段
2. **MDC（Mapped Diagnostic Context）**：将 TraceId 放入 MDC，日志框架自动打印
3. **ThreadLocal**：将 TraceId 存储在 ThreadLocal 中，同一线程内共享
4. **跨线程传递**：使用 `InheritableThreadLocal` 或手动传递

```java
// 示例：Filter 中注入 TraceId
@Component
public class TraceFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null) {
            traceId = UUID.randomUUID().toString();
        }
        MDC.put("traceId", traceId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove("traceId");
        }
    }
}
```

#### OpenTelemetry（趋势）

OpenTelemetry 是 CNCF 的可观测性标准，合并了 OpenTracing 和 OpenCensus：
- 统一了链路追踪（Traces）、指标（Metrics）、日志（Logs）三大信号
- 提供 vendor-neutral 的 API 和 SDK
- 是未来可观测性的标准方向

---

### 负载均衡

负载均衡是将请求分发到多个服务器的技术，目的是提高系统的可用性和吞吐量。

#### 负载均衡分类

**1. 硬件负载均衡**
- F5、A10 等专用硬件设备
- 性能高，但价格昂贵，扩展性差

**2. 软件负载均衡**
- Nginx（七层，HTTP/HTTPS）
- LVS（四层，TCP/UDP）
- HAProxy（四层/七层）

**3. 客户端负载均衡**
- Ribbon、LoadBalancer（Spring Cloud）
- 客户端自己维护服务列表，自行选择目标服务器

#### 常见负载均衡算法

**1. 轮询（Round Robin）**
- 按顺序依次将请求分发到每台服务器
- 实现简单，适合服务器性能相近的场景
- 不考虑服务器当前负载

```
请求1 → 服务器A
请求2 → 服务器B
请求3 → 服务器C
请求4 → 服务器A（循环）
```

**2. 加权轮询（Weighted Round Robin）**
- 为每台服务器分配权重，权重高的服务器获得更多请求
- 适合服务器性能不同的场景
- Nginx 的 `weight` 配置就是加权轮询

```
服务器A（weight=5）：获得 5/10 的请求
服务器B（weight=3）：获得 3/10 的请求
服务器C（weight=2）：获得 2/10 的请求
```

**3. 最少连接（Least Connections）**
- 将请求分发到当前连接数最少的服务器
- 适合请求处理时间差异大的场景
- 能自动适应服务器负载变化

```
服务器A：当前 10 个连接
服务器B：当前 5 个连接  ← 新请求分发到这里
服务器C：当前 8 个连接
```

**4. 加权最少连接（Weighted Least Connections）**
- 结合权重和连接数，选择 `连接数/权重` 最小的服务器
- 综合考虑服务器性能和当前负载

**5. IP Hash**
- 根据客户端 IP 地址的 Hash 值分发请求
- 同一客户端的请求总是被分发到同一台服务器
- 适合需要会话保持（Session Sticky）的场景
- 缺点：服务器增减时，大量请求会重新分配

**6. 随机（Random）**
- 随机选择一台服务器
- 实现简单，适合服务器性能相近且请求数量大的场景

**7. 一致性哈希（Consistent Hashing）**

一致性哈希是分布式系统中常用的负载均衡算法，特别适合有缓存的场景。

**原理**：
- 将哈希值空间组织成一个虚拟的环（0 ~ 2^32-1）
- 将服务器节点映射到环上（通过 Hash(服务器IP)）
- 将请求映射到环上（通过 Hash(请求Key)）
- 请求沿顺时针方向找到的第一个服务器节点就是目标服务器

**优势**：
- **节点增减影响小**：添加或删除节点时，只影响相邻节点的请求，其他节点的请求不受影响
- **适合缓存场景**：同一请求总是被路由到同一服务器，缓存命中率高

**虚拟节点**：
- 问题：节点数量少时，请求分布不均匀
- 解决：为每个物理节点创建多个虚拟节点（如 150 个），使分布更均匀
- `虚拟节点1#A → 物理节点A`
- `虚拟节点2#A → 物理节点A`
- `虚拟节点1#B → 物理节点B`

```
一致性哈希环：
         0
        ╱ ╲
    虚拟A1   虚拟B1
      │        │
    虚拟A2   虚拟B2
        ╲ ╱
       2^32

请求X（Hash=100）→ 顺时针找到 虚拟A1 → 物理节点A
请求Y（Hash=200）→ 顺时针找到 虚拟B1 → 物理节点B
```

**应用场景**：
- 分布式缓存（如 Memcached、Redis Cluster）
- 分布式数据库分片
- CDN 节点选择

#### Nginx 负载均衡配置

```nginx
upstream backend {
    # 加权轮询（默认）
    server 192.168.1.1 weight=5;
    server 192.168.1.2 weight=3;
    server 192.168.1.3 weight=2;

    # 最少连接
    # least_conn;

    # IP Hash（会话保持）
    # ip_hash;

    # 响应时间最短优先
    # fair;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

#### 客户端负载均衡（Spring Cloud）

```java
// Spring Cloud LoadBalancer 配置
@Bean
@LoadBalancerClient(name = "user-service", configuration = CustomLoadBalancerConfig.class)
public ReactorLoadBalancer<ServiceInstance> loadBalancer(
        Environment environment,
        LoadBalancerClientFactory loadBalancerClientFactory) {
    String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
    return new RoundRobinLoadBalancer(
        loadBalancerClientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class),
        name);
}
```

#### 四层 vs 七层负载均衡

| 对比项 | 四层负载均衡 | 七层负载均衡 |
|-------|------------|------------|
| **工作层次** | 传输层（TCP/UDP） | 应用层（HTTP/HTTPS） |
| **转发依据** | IP + 端口 | URL、Header、Cookie 等 |
| **性能** | 高（只看 IP 和端口） | 较低（需要解析应用层数据） |
| **功能** | 简单转发 | URL 路由、SSL 卸载、缓存、压缩 |
| **典型产品** | LVS、F5 | Nginx、HAProxy |

## 相关笔记
- [[分布式 ID 生成方案]]
- [[微服务相关]]

## 来源
来源：Java八股文PDF

