# 代码库侦察 Agent（最终项目）

把五课学到的能力拼成一个可运行的 Agent：只读工具 allowlist + 自定义「报告持久化」工具 + Coding Agent SDK。

## 组成

| 文件 | 作用 |
|------|------|
| `src/recon-agent.ts` | 真实 Agent：只读工具 `read/grep/find/ls` + 自定义 `save-report`，扫描目标仓库并写出 `RECON_REPORT.md` |
| `src/recon-demo.ts` | 零成本验证：脚本化 faux 模型跑一遍相同接线，证明 SDK + 自定义工具 + 报告持久化真实可用 |

## 零成本验证（无需 API key）

```bash
npm install --ignore-scripts
npm run demo
```

预期输出（关键行）：

```text
[roles] user -> assistant -> toolResult -> assistant
[provider calls] 2
[report exists] true
[report] # Recon Report | - purpose: toy project | - stack: TypeScript
[verify] all assertions passed
```

## 真实运行（需要已配置的 provider）

先配置一个模型（任选其一）：

- 环境变量：`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 等，pi 会自动识别
- 或 `pi login` 交互式登录

然后：

```bash
npm start [目标仓库路径]     # 缺省扫描当前目录
```

Agent 会用只读工具探查仓库，并把结构化报告写入目标仓库的 `RECON_REPORT.md`。整个过程不会改动任何项目文件。

## 这份代码对应哪些课

- **第 2 课**：`Agent` 运行时 + 工具 + 双 Turn 闭环
- **第 3 课**：自定义工具（`save-report`）+ throw 语义
- **第 4 课**：持久化思路（把结果落到磁盘）
- **第 5 课**：`createAgentSession` + `customTools` + 跨来源 allowlist
