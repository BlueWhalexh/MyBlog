---
tags: [八股文, 网络, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# GET 与 POST 的区别

## 问题
GET 和 POST 请求有什么区别？它们的本质区别是什么？

## 答案

### 语义区别

| 对比项 | GET | POST |
|-------|-----|------|
| **语义** | 获取资源（查询） | 提交数据（创建/更新） |
| **幂等性** | 幂等（多次请求结果相同） | 非幂等（多次请求可能产生不同结果） |
| **安全性** | 相对安全（不修改服务器数据） | 不安全（可能修改服务器数据） |

- **GET**：从服务器获取资源，应该是**幂等**的（多次请求结果相同，不会产生副作用）
- **POST**：向服务器提交数据，通常用于创建或更新资源，**非幂等**（多次请求可能创建多条记录）

### 参数位置

| 对比项 | GET | POST |
|-------|-----|------|
| **参数位置** | URL 查询参数（`?key=value&key2=value2`） | 请求体（Body） |
| **参数长度** | 受 URL 长度限制（浏览器通常限制 2KB~8KB） | 无限制（受服务器配置限制） |
| **参数可见性** | 参数在 URL 中，可见（浏览器地址栏、日志） | 参数在请求体中，不可见（但不等于安全） |
| **参数类型** | 只支持 ASCII 字符 | 支持多种编码（如 multipart/form-data，支持二进制） |

**GET 请求示例**：
```
GET /api/user?id=123&name=zhangsan HTTP/1.1
Host: example.com
```

**POST 请求示例**：
```
POST /api/user HTTP/1.1
Host: example.com
Content-Type: application/json

{"id": 123, "name": "zhangsan"}
```

### 安全性

| 对比项 | GET | POST |
|-------|-----|------|
| **浏览器安全** | 参数暴露在 URL 中，会被浏览器历史、日志记录 | 参数在请求体中，不会被浏览器历史记录 |
| **网络安全** | 两者都不安全，都需要 HTTPS 加密 | 两者都不安全，都需要 HTTPS 加密 |
| **CSRF** | 易受 CSRF 攻击 | 也易受 CSRF 攻击，但可以通过 Token 防护 |

**重要**：GET 和 POST 都**不安全**，因为 HTTP 本身是明文传输。安全性应该通过 HTTPS 来保证，而不是依赖请求方法。

### 缓存

| 对比项 | GET | POST |
|-------|-----|------|
| **浏览器缓存** | 会被缓存 | 默认不被缓存 |
| **书签** | 可以收藏为书签 | 不能收藏为书签 |
| **历史记录** | 参数会保留在浏览器历史中 | 参数不会保留在浏览器历史中 |
| **预请求** | 浏览器可以预加载（prefetch） | 不会被预加载 |

**缓存机制**：
- GET 请求的响应可以被浏览器缓存（通过 `Cache-Control`、`Expires` 等头部控制）
- POST 请求默认不会被缓存，但可以通过设置 `Cache-Control` 来缓存

### 编码

| 对比项 | GET | POST |
|-------|-----|------|
| **默认编码** | URL 编码（application/x-www-form-urlencoded） | application/x-www-form-urlencoded |
| **支持编码** | 只支持 URL 编码 | 支持多种编码：application/x-www-form-urlencoded、multipart/form-data、application/json 等 |
| **二进制数据** | 不支持 | 支持（multipart/form-data） |

**POST 常见的 Content-Type**：
1. `application/x-www-form-urlencoded`：表单默认编码，参数以 key=value 形式发送
2. `multipart/form-data`：支持文件上传，每个字段独立编码
3. `application/json`：JSON 格式，RESTful API 常用
4. `text/xml`：XML 格式

### TCP 层面的区别

**从 TCP 的角度看，GET 和 POST 本质上没有区别**：
- 它们都是 HTTP 协议的方法，在传输层都是基于 TCP 的
- 都需要经过 TCP 三次握手建立连接
- 数据包的传输方式相同

**唯一的细微差别**：
- GET 请求通常将参数和头部放在一个 TCP 数据包中发送
- POST 请求中，`Content-Type` 为 `application/x-www-form-urlencoded` 时，Chrome 和 Firefox 会将头部和数据分开发送（先发头部，等服务器返回 100 Continue 后再发数据）
- 但这只是浏览器的实现细节，不是 HTTP 协议的规定
- 使用 `multipart/form-data` 时，POST 也会将头部和数据分开发送

### 总结

| 对比项 | GET | POST |
|-------|-----|------|
| **语义** | 获取资源 | 提交数据 |
| **参数位置** | URL | Body |
| **参数长度** | 有限制 | 无限制 |
| **安全性** | 不安全 | 不安全 |
| **幂等性** | 幂等 | 非幂等 |
| **缓存** | 可缓存 | 默认不缓存 |
| **编码** | URL 编码 | 多种编码 |
| **TCP 本质** | 无区别 | 无区别 |

**面试回答要点**：
1. 语义上：GET 是获取，POST 是提交
2. 参数上：GET 在 URL，POST 在 Body
3. 安全上：都不安全，都需要 HTTPS
4. 本质上：TCP 层面没有区别，都是 HTTP 请求
5. 实际上：GET 和 POST 的区别更多是语义和规范上的，技术实现上差异很小

## 相关笔记
- [[HTTP 与 HTTPS 的区别]]
- [[HTTP 状态码]]

## 来源
来源：Java八股文PDF
