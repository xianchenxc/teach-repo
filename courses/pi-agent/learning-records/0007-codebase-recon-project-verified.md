# 最终项目（代码库侦察 Agent）已跑通，学习路线通关

Vernon 完成了最终项目，运行 `project/codebase-recon/` 的零成本 demo（官方 Faux Provider，零 API 成本）并回报输出：

```text
[roles] user -> assistant -> toolResult -> assistant
[provider calls] 2
[report exists] true
[report] # Recon Report | - purpose: toy project | - stack: TypeScript
[verify] all assertions passed
```

该输出精确匹配 demo 内置断言与项目说明，证明最终项目真实跑通：

1. **SDK 接线** — `createAgentSession` + `customTools` + 跨来源 allowlist 端到端工作。
2. **自定义工具** — `save-report` 被模型调用，结果回填（`toolResult`），形成 `user → assistant → toolResult → assistant` 闭环。
3. **报告持久化** — 工具把报告写入磁盘（`report exists: true`），内容与脚本化模型输出一致。

由此，整条「从 Agent Loop 到完整 SDK Agent」学习路线正式通关：三层架构 → 最小 SDK Agent → 自定义工具与错误/安全钩子 → 会话状态与持久化 → Extensions/Skills/SDK → 完整项目。

## Evidence

- `[roles]` 四段闭环与 SDK 断言一致。
- `[report exists] true` 与 `[report]` 内容一致，证明报告持久化落地。
- `[provider calls]` 2（toolUse + 收尾）。
- `[verify] all assertions passed`。
