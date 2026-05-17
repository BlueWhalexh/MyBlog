---
tags: [八股文, 消息队列, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Kafka Rebalance 机制与消息堆积

## 问题
什么是 Kafka 的 Rebalance？触发条件是什么？消息堆积的原因和解决方案？Kafka 的核心概念有哪些？

## 答案

### Kafka 架构和核心概念

#### 整体架构

Kafka 是一个分布式的流处理平台，主要用于构建实时数据管道和流式应用。

```
Producer（生产者）
    ↓ 发送消息
Broker（Kafka 集群）
    ├── Topic A
    │   ├── Partition 0 (Leader)
    │   ├── Partition 1 (Leader)
    │   └── Partition 2 (Leader)
    └── Topic B
        ├── Partition 0 (Leader)
        └── Partition 1 (Leader)
    ↓ 消费消息
Consumer Group（消费者组）
    ├── Consumer 1 → Partition 0
    ├── Consumer 2 → Partition 1
    └── Consumer 3 → Partition 2
```

#### 核心概念详解

**1. Broker（代理节点）**
- Kafka 集群中的每一台服务器就是一个 Broker
- 一个 Kafka 集群由多个 Broker 组成
- 每个 Broker 有一个唯一的 ID（broker.id）
- Broker 负责接收生产者的消息、存储消息、处理消费者的拉取请求

**2. Topic（主题）**
- Topic 是消息的逻辑分类，类似于数据库中的表
- 生产者将消息发送到指定的 Topic，消费者从 Topic 中消费消息
- 一个 Topic 可以有多个 Partition

**3. Partition（分区）**
- Partition 是 Topic 的物理分片，是 Kafka 并行处理的基本单位
- 每个 Partition 是一个有序的、不可变的消息序列
- 每个 Partition 内的消息都有一个唯一的 Offset（偏移量）
- Partition 可以分布在不同的 Broker 上，实现水平扩展

**Partition 的作用**：
- **并行处理**：多个 Partition 可以被多个消费者并行消费
- **水平扩展**：增加 Partition 数量可以提高吞吐量
- **数据分布**：数据分散到多个 Broker，避免单点瓶颈

**4. Consumer Group（消费者组）**
- Consumer Group 是一组消费者的集合，共同消费一个 Topic
- 一个 Topic 的每个 Partition 只能被同一 Consumer Group 中的一个 Consumer 消费
- 不同 Consumer Group 可以独立消费同一个 Topic（互不影响）

**消费者与 Partition 的关系**：

| 场景 | 效果 |
|------|------|
| 消费者数量 > Partition 数量 | 多余消费者**闲置浪费** |
| 消费者数量 = Partition 数量 | 一对一消费，**最佳配比** |
| 消费者数量 < Partition 数量 | 部分消费者消费多个分区，负载不均 |

> 一般建议：消费者组内消费者数量等于 Partition 数量。

**5. Offset（偏移量）**
- 每个 Partition 中的消息都有一个唯一的 Offset，从 0 开始递增
- Offset 是消息在 Partition 中的唯一标识
- 消费者通过 Offset 记录自己消费到哪个位置
- Offset 由消费者自己管理，存储在 Kafka 的 `__consumer_offsets` Topic 中

#### Offset 自动提交的实现

Kafka 消费者支持两种 Offset 提交方式：**自动提交** 和 **手动提交**。

**自动提交（enable.auto.commit）**：
- 默认配置：`enable.auto.commit = true`
- 提交间隔：`auto.commit.interval.ms = 5000`（默认 5 秒）
- 消费者会定期（默认每 5 秒）自动提交当前消费到的 Offset
- 提交的是 `poll()` 方法返回的最新消息的 Offset + 1

**自动提交的问题**：
```
时间线：
T1: 消费者 poll() 返回消息 [0, 1, 2, 3, 4]
T2: 消费者处理消息 0, 1, 2
T3: 自动提交 Offset = 5（表示已消费到 5）
T4: 消费者处理消息 3 时崩溃
T5: 消费者重启，从 Offset = 5 开始消费
T6: 消息 3, 4 丢失（还没处理就被标记为已消费）
```

**手动提交**：
```java
// 同步提交（阻塞直到提交成功）
consumer.commitSync();

// 异步提交（不阻塞，但可能失败）
consumer.commitAsync();

// 指定 Offset 提交
consumer.commitSync(Collections.singletonMap(
    new TopicPartition("topic", 0),
    new OffsetAndMetadata(offset + 1)
));
```

**手动提交的优势**：消费者可以在业务逻辑处理完成后再提交 Offset，确保消息不会丢失。

### Rebalance（再均衡）

### Rebalance（再均衡）

Rebalance 是 Kafka 确保消费者组内所有消费者如何达成一致、分配分区的机制。

### 触发条件

Rebalance 在以下三种情况发生：
1. **消费者组中消费者数量变化**：新消费者加入，或某个消费者退出/崩溃
2. **Topic 的 Partition 数量变化**：分区增加或减少
3. **消费者组订阅的 Topic 数量变化**：订阅的 Topic 增加或减少

### Rebalance 过程

1. 触发 Rebalance 后，消费者组下的**所有消费者停止工作**
2. 所有消费者协调在一起，使用分配策略（如 RangeAssignor、RoundRobinAssignor）重新分配分区
3. 分配完成后，各消费者恢复消费

### Rebalance 的不良影响

- Rebalance 过程中**所有消费者停止消费**，直到 Rebalance 完成
- 如果 Rebalance 频繁发生，会严重影响消费吞吐量
- 可能导致消息重复消费（offset 提交和 Rebalance 的时序问题）

### 消费者与 Partition 的关系

| 场景 | 效果 |
|------|------|
| 消费者数量 > Partition 数量 | 多余消费者**闲置浪费** |
| 消费者数量 = Partition 数量 | 一对一消费，**最佳配比** |
| 消费者数量 < Partition 数量 | 部分消费者消费多个分区，负载不均 |

> 一般建议：消费者组内消费者数量等于 Partition 数量。

### 消息堆积

**定义**：消费者消费速度跟不上生产者生产速度，导致消息在 Broker 中不断积压。

### 消息堆积的原因

- 消费者消费速度太慢（业务处理耗时长）
- 消费者数量少于 Partition 数量
- 消费者频繁 Full GC 导致暂停
- 消费者未正确提交 offset，导致消费停滞
- 网络问题导致消费延迟

### 解决方案

#### 消费者端优化
1. **优化消费逻辑**：减少单条消息处理耗时，避免在消费线程中做远程调用、大量计算等
2. **增加消费者数量**：当消费者数 < Partition 数时，增加消费者（但不能超过 Partition 数）
3. **批量消费**：调整 `max.poll.records` 参数，一次拉取多条消息批量处理
4. **检查 offset 提交**：确认消费者正确提交了 offset，避免消费停滞

#### 生产者端优化
- 在生产者端设置**限流机制**，控制消息生产速度

#### Kafka 集群优化
1. **增加分区数量**：根据生产和消费速度，合理增加 Partition 数量以提高并行度
   - 例如从 2 个分区增加到 10 个，提高并行处理能力
   - 注意：分区过多会增加管理开销和 Rebalance 耗时
2. **调整消费者参数**：
   - `session.timeout.ms`：适当增大，避免频繁判定消费者死亡触发 Rebalance
   - `max.poll.interval.ms`：根据实际消费耗时合理设置

### 最佳实践
- 消费者数量 = Partition 数量
- 合理设置 session.timeout.ms 避免误判消费者死亡
- 监控消费延迟（lag），及时发现堆积问题
- 使用死信队列处理消费失败的消息，避免阻塞正常消费

## 相关笔记
- [[Kafka 分区设置与顺序性保证]]
- [[消息队列重复消费与丢失问题]]
- [[MQ 选型详解]]

## 来源
来源：Java八股文PDF
