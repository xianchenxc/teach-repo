# Extensions、Skills 与 Coding Agent SDK 已跑通并验证

Vernon 在第五课实验中运行了 `labs/skills-extensions-sdk`（官方 Faux Provider，零 API 成本），测验 4/4，并回报运行输出：

```text
[skills] browser-testing, code-review
[roles] user -> assistant -> toolResult -> assistant
[extension events] agent_start -> tool_call:shout -> agent_end:4
```

该输出精确匹配 lab 内置断言与讲义预告，证明三个机制全部真实跑通：

1. **Skills** — 两个合法 `SKILL.md` 被发现（缺 `description` 的那个被跳过并产生 1 条诊断），`formatSkillsForPrompt` 渲染出 `<available_skills>` XML 块。
2. **Extensions** — 内联 `ExtensionFactory` 的 `pi.on` 钩子（agent_start / tool_call / agent_end）真实触发，`pi.registerTool` 注册的 `shout` 工具被模型调用。
3. **Coding Agent SDK** — `createAgentSession` 端到端跑通：注入脚本化 faux 模型、allowlist 列出扩展工具，得到 `user → assistant → toolResult → assistant` 闭环，2 轮模型调用。

由此，Skills 注入、Extension 钩子与 SDK allowlist 语义已掌握，五课速通全部完成，可进入最终项目（代码库侦察 Agent）。

## Evidence

- 测验 4/4。
- `[skills]` 两技能与发现规则一致。
- `[roles]` 四段闭环与 `[extension events]` 生命周期一致。
- `[provider calls]` 2（toolUse + 收尾）。
