# Mission: PI Agent

## Why
系统理解 PI 的分层架构、Agent Loop 与工具执行机制，并能基于 PI SDK 独立开发一个可运行、可扩展、可持久化的实用 Agent，而不只会调用现成 CLI。

## Success looks like
- 能从源码准确讲清 `pi-ai`、`pi-agent-core`、`pi-coding-agent` 的职责边界
- 能逐步追踪一次“用户消息 → 模型 → 工具 → 工具结果 → 模型”的完整事件流
- 能使用 PI SDK 编写自定义工具、事件订阅、会话状态和安全钩子
- 最终完成并真实运行一个完整 Agent 项目

## Constraints
- 已理解通用 Agent Loop 与工具调用概念，但尚未使用 PI
- 先集中速通核心机制，再通过完整项目掌握
- 以 TypeScript、官方文档和当前源码为准

## Out of scope
- 第一阶段不深入 TUI 渲染细节
- 第一阶段不开发新的 LLM Provider
- 不把 PI CLI 的所有快捷键和配置项当作主线
