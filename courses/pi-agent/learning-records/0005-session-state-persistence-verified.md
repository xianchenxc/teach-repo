# 会话状态与持久化已跑通并验证

Vernon 在第四课实验中运行了 `labs/session-state-persistence`（官方 Faux Provider，零 API 成本），测验 4/4，并回报运行输出：

```text
[session-2 roles] user -> assistant -> toolResult -> assistant -> user -> assistant
[event types] agent_start -> turn_start -> message_start -> message_end -> message_update -> tool_execution_start -> tool_execution_end -> turn_end -> agent_end
```

该输出精确匹配 lab 内置断言与讲义预告，证明三个主题全部真实跑通：

1. **AgentState** — 转录存于 `agent.state.messages`（含 `toolResult` 消息），`tools`/`messages` 是 accessor（赋值先拷贝顶层数组）。
2. **事件流** — 一次带工具的 run 从 `agent_start` 走到 `agent_end`，去重后覆盖 agent/turn/消息/工具四类事件，与源码 `AgentEvent` 联合类型一致。
3. **持久化** — 会话 1 的 4 条消息 JSON 快照 → 恢复进新 Agent（`initialState.messages`）→ 会话 2 续跑追加 2 条，得到 6 段序列 `user,assistant,toolResult,assistant,user,assistant`，模型答出了持久化的事实。

由此，状态字段、事件生命周期与快照恢复边界已掌握，不再需要入门讲解。

## Evidence

- 测验 4/4。
- `[session-2 roles]` 六段序列与源码断言一致。
- `[event types]` 九类事件与 `AgentEvent` 生命周期一致。
- `[provider calls]` 3（会话 1 两轮 + 会话 2 一轮）与预设响应一致。
