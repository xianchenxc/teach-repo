# 已跑通最小 SDK Agent 并验证消息流转

Vernon 在第二课实验中运行了 `labs/minimal-agent`（官方 Faux Provider，零 API 成本），真实经过 `Agent` 运行时、工具校验执行与双 Turn。上报的 `[roles]` 输出为：

```text
[roles] user -> assistant -> toolResult -> assistant
```

该序列精确匹配 lab 内置断言 `user,assistant,toolResult,assistant`，证明实验通过。它对应真实 Agent Loop 的完整闭环：

1. `user` — 用户输入消息
2. `assistant` — 模型首轮产出，决定调用 `multiply` 工具（stopReason: `toolUse`）
3. `toolResult` — 工具执行结果被回填进消息列表
4. `assistant` — 模型第二轮基于工具结果给出最终回答

由此，SDK 代码已能从概念映射回真实事件流：一次「用户消息 → 模型 → 工具 → 工具结果 → 模型」的完整 Loop 已实际跑通，无需再重复双 Turn 与 toolResult 回填的入门讲解。

## Evidence

- 实验运行输出 `[roles] user -> assistant -> toolResult -> assistant`，与源码断言一致。
- lab 另设断言 `faux.state.callCount === 2`（两次模型调用，Faux Provider 预设两轮响应，确定性通过）。
