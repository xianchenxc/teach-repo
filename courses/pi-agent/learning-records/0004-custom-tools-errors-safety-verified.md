# 自定义 Tool、错误与安全钩子已跑通并验证

Vernon 在第三课实验中运行了 `labs/custom-tools-errors-safety`（官方 Faux Provider，零 API 成本），测验 4/4，并回报运行输出：

```text
[roles] user -> assistant -> toolResult -> assistant -> toolResult -> assistant -> toolResult -> assistant -> toolResult -> assistant
[provider calls] 5
[errors] ["Division by zero","Command \"rm -rf /\" is not in the allowlist"]
```

该输出精确匹配 lab 内置断言与讲义预告，证明三个机制全部真实跑通：

1. **throw 语义** — `divide(10,0)` 抛出「Division by zero」，Runtime 转成 `isError: true` 的 toolResult 回填，模型据此换参数重试成功。
2. **beforeToolCall 拦截** — `shell("rm -rf /")` 被 allowlist 拦截，`execute` 未运行，生成带 reason 的错误 toolResult；对应 `[errors]` 第二条。
3. **afterToolCall 审计** — 两次成功除法都经过审计钩子（`[audited] 2`），字段整替换边界已掌握。

5 轮模型调用（`[provider calls] 5`）对应：成功除法 → 除零抛错 → 重试 → 拦截 shell → 收尾回答。由此，自定义工具、错误回填与安全钩子不再需要入门讲解。

## Evidence

- 测验 4/4。
- `[roles]` 十段消息序列与源码断言 `user,assistant,...` 一致。
- `[errors]` 两条与抛错文案、allowlist 拦截理由一致。
- `[provider calls] 5` 与预设五轮响应一致。
