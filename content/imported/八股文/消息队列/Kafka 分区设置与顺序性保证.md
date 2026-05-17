---
tags: [八股文, 消息队列, 面试]
source: "[[todoList_detail#Day 39]]"
date: 2026-03-24
---

# Kafka 分区设置与顺序性保证

## 问题
Kafka 中如何设置分区？如何保证消息的顺序性？ISR 机制是什么？

## 答案

### ISR 机制（In-Sync Replicas）

#### 什么是 ISR？

ISR（In-Sync Replicas，同步副本集）是指与 Leader 保持同步的 Partition 副本集合。ISR 中的副本必须满足以下条件：
- 副本所在 Broker 与 ZooKeeper 保持连接
- 副本的复制进度不能落后于 Leader 太多（由 `replica.lag.time.max.ms` 控制，默认 30 秒）

#### 相关概念

**LEO（Log End Offset）**：
- 每个副本（包括 Leader 和 Follower）都有一个 LEO
- LEO 表示该副本最后一条消息的 Offset + 1（即下一条待写入的位置）

**HW（High Watermark，高水位）**：
- Leader 副本的 HW 是所有 ISR 副本中最小的 LEO
- HW 之前的消息表示已经被所有 ISR 副本同步完成
- 消费者只能消费到 HW 之前的消息（保证数据一致性）

**示例**：
```
Partition 有 3 个副本：Leader, Follower1, Follower2

Leader:    LEO = 10
Follower1: LEO = 8
Follower2: LEO = 9

HW = min(10, 8, 9) = 8

消费者只能消费到 Offset 0~7 的消息（共 8 条）
```

#### ISR 的作用

**1. 保证数据可靠性**
- 只有 ISR 中的副本才参与数据同步
- Producer 发送消息时，根据 `acks` 配置决定何时确认：
  - `acks = 0`：不等待确认，性能最高但可能丢数据
  - `acks = 1`：只等待 Leader 确认，Leader 宕机可能丢数据
  - `acks = all`（推荐）：等待所有 ISR 副本确认，数据最可靠

**2. 动态调整副本集合**
- 如果某个 Follower 长时间未同步数据（超过 `replica.lag.time.max.ms`），会被移出 ISR
- 当落后的 Follower 追上 Leader 的进度后，会重新加入 ISR
- 这种动态调整机制保证了 ISR 中的副本都是"健康"的

**ISR 的收缩与扩张**：
```
初始状态: ISR = {Leader, Follower1, Follower2}

Follower1 网络延迟，30秒未同步:
ISR 收缩为: {Leader, Follower2}
Follower1 被移出 ISR

Follower1 恢复，追上 Leader:
ISR 扩张为: {Leader, Follower1, Follower2}
Follower1 重新加入 ISR
```

#### ISR 与数据可靠性的关系

**场景：Leader 宕机后数据是否丢失？**

1. **acks = 1**：Producer 只等待 Leader 确认，如果 Leader 宕机且数据未同步到 Follower，数据会丢失
2. **acks = all + min.insync.replicas = 1**：虽然等待所有 ISR 副本确认，但如果 ISR 中只有 Leader 一个副本（其他副本都被移出了），Leader 宕机后数据也会丢失
3. **acks = all + min.insync.replicas = 2**（推荐）：要求 ISR 中至少有 2 个副本，Producer 才能发送成功。这样即使 Leader 宕机，Follower 中还有数据

**推荐配置**：
```
acks = all
min.insync.replicas = 2
replication.factor = 3
```

### Kafka 分区设置与顺序性保证

**RAG 项目 Kafka 配置**：
```java
// 生产者配置
props.put("acks", "all");                    // 所有副本确认
props.put("retries", 3);                     // 失败重试
props.put("max.in.flight.requests.per.connection", 1);  // 禁止重试时乱序
props.put("enable.idempotence", "true");     // 幂等性

// 分区策略：按 fileId 分区，保证同一文件的消息顺序
producer.send(new ProducerRecord<>("file.process", fileId, json));
```

**分区设置**：
- **3 个分区**：根据文件 ID 哈希取模，分散负载
- **key=fileId**：保证同一文件的所有消息进入同一分区
- **单分区单线程消费**：保证消息处理顺序

**顺序性保证**：
1. 同一分区内部有序（key 相同进入同一分区）
2. 单线程消费（每个分区一个消费者线程）
3. 幂等性（`enable.idempotence=true`）
4. 手动提交 offset（处理完再 commit）

## 相关笔记
- [[消息队列重复消费与丢失问题]]
- [[MQ 选型详解]]
- [[Kafka Rebalance 机制与消息堆积]]

## 来源
原始记录：[[todoList_detail#Day 39 (03-24)]]
