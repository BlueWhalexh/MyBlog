---
tags: [八股文, 场景题, 面试]
source: "[[2025Java面试攻略场景题]]"
date: 2026-04-30
---

# Token被窃取防护方案

## 问题
如果token被窃取了，是不是就能伪造登录了？

## 面试考察点
- Token与Session的本质区别及JWT三部分的安全意义
- Token盗用场景的攻防意识（MITM/XSS/CSRF）
- 安全防护体系设计能力（纵深防御）
- 应急响应思维（漏洞发生后的处置流程）

## 解题思路
> 核心问题：裸Token无防护时确实可被窃取伪造登录，但可通过Token加密、设备绑定、时间戳校验等手段大幅降低风险。

Token被窃取的风险程度取决于防护方案：裸Token风险最高（直接复制即可登录），有IP绑定风险降低（需同时伪造IP），短期Token+刷新机制风险可控（攻击窗口期有限），硬件指纹绑定风险最低（需克隆设备特征）。

常见窃取手段及防护：网络嗅探 -> 强制HTTPS+HSTS；XSS攻击 -> CSP策略+HttpOnly Cookie；恶意扩展 -> 关键操作二次认证；服务器泄露 -> Token加密存储+定期轮换。需构建纵深防御体系。

## 具体方案
### 方案一：Token对称加密
- 原理：生成JWT后用AES加密，客户端和服务端共享密钥才能解密
- 实现：`AESUtil.encrypt(token)` -> 传输 -> `AESUtil.decrypt(encryptedToken)`
- 优点：即使Token被窃取也无法直接使用

### 方案二：绑定设备信息与IP
- 原理：JWT中嵌入deviceId和ipAddress，每次请求校验是否匹配
- 实现：`Jwts.builder().claim("deviceId", deviceId).claim("ipAddress", ipAddress)`
- 优点：Token只能在特定设备和网络下使用

### 方案三：时间戳防重放
- 原理：Token中嵌入时间戳，校验请求时间是否在合理范围内（如5分钟）
- 优点：防止Token被重复使用

## 要点总结
- 裸Token风险最高，必须配合加密/绑定/时间戳等防护手段
- 强制HTTPS+HSTS防止网络嗅探，CSP+HttpOnly Cookie防止XSS
- 关键操作（支付/改密）应要求二次认证（短信/人脸识别）
- 异常登录时应急响应：立即失效Token（黑名单）-> 通知用户 -> 审计记录 -> 升级防护
- 设备指纹比对（UA/IP/Canvas指纹）+行为分析（操作频率/时序特征）构建智能风控

## 相关笔记
- [[单点登录实现]]
- [[HTTP 与 HTTPS 的区别]]
- [[Security Filter vs Interceptor]]
