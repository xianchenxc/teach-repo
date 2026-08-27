# PI Agent Resources

> 源码基线：`earendil-works/pi` commit `e86823096c5bad39e1ca282ec24bc5eb9bec745b`（2026-08-26）。本地镜像：`source/pi/`。

## Knowledge

- [Pi 官方文档](https://pi.dev/docs/latest)
  官方概览、配置、扩展与编程接口入口。用于确认公开能力和最新用法。
- [Pi 官方仓库](https://github.com/earendil-works/pi)
  实现层事实来源。用于核验包边界、Agent Loop、工具执行和事件语义。
- [`pi-agent-core` README](https://github.com/earendil-works/pi/tree/main/packages/agent)
  Stateful Agent、事件流、工具调用、steering/follow-up 及低层 API 的核心参考。
- [`pi-ai` README](https://github.com/earendil-works/pi/tree/main/packages/ai)
  Provider/Model、统一流式接口、工具 schema、认证和上下文格式参考。
- [Coding Agent SDK examples](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/sdk)
  从最小会话到模型、工具、扩展、持久化与完整控制的官方示例。
- [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts)
  Agent Loop 的实现真相：上下文变换、模型流、工具预检/执行/结果回填及循环终止。

## Wisdom (Communities)

- [Pi Discord](https://discord.com/invite/3cU7Bz4UPx)
  适合验证扩展设计、实际踩坑和当前最佳实践。
- [GitHub Discussions](https://github.com/earendil-works/pi/discussions)
  适合搜索设计讨论和向维护者/使用者提出可复现的问题。
