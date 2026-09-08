# Teaching Notes

- 学员：Vernon
- 背景：全栈偏前端，熟悉 JS/Python；了解通用 Agent Loop 与工具调用，但未使用 PI。
- 节奏：先集中速通，再开发一个完整 Agent。
- 教学偏好：底层机制、权威来源、真实工具验证、结构化高效输出。
- 主线顺序：架构地图 → loop 源码追踪 → 工具与事件 → SDK 最小实现 → 会话/安全/扩展 → 完整项目。
- 完整项目暂定：代码库侦察 Agent（只读起步，随后加入报告持久化与可控命令工具）。
- 第一课已完成：架构与工具调用闭环测验 4/4。
- 第二课已完成：最小 SDK Agent 实验（官方 Faux Provider，零 API 成本）真实跑通，`[roles] user -> assistant -> toolResult -> assistant` 与源码断言一致，双 Turn 与 toolResult 回填已验证。
- 第三课已完成：自定义 Tool、错误与安全钩子。测验 4/4，`[roles]` 十段序列与 `[errors]` 两条均与源码断言一致，throw→isError 回填、beforeToolCall 拦截、afterToolCall 审计全部真实跑通。
- 第四课已备好：会话状态与持久化。实验 `labs/session-state-persistence/` 已真实跑通（AgentState、事件流、JSON 快照→恢复→续跑），等待学员运行并回报 `[roles]`、`[event types]`。
- 下一课：Extensions、Skills 与 Coding Agent SDK。
