import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";

// ─────────────────────────────────────────────────────────────
// 代码库侦察 Agent（最终项目）
//
// 把五课学到的能力拼成一个可运行的 Agent：
//   · 只读工具 allowlist（read / grep / find / ls）
//   · 自定义工具 + 报告持久化（save-report，第 3/4 课）
//   · Coding Agent SDK（createAgentSession，第 5 课）
//
// 用法（需要已配置的 provider，见 README）：
//   npm start [目标仓库路径]
// ─────────────────────────────────────────────────────────────

const targetRepo = process.argv[2] ? resolve(process.argv[2]) : process.cwd();

const saveReport: ToolDefinition = {
  name: "save-report",
  label: "Save Report",
  description: "Persist the reconnaissance report to RECON_REPORT.md in the target repo.",
  parameters: Type.Object({ content: Type.String() }),
  execute: async (_toolCallId, { content }) => {
    const out = resolve(targetRepo, "RECON_REPORT.md");
    writeFileSync(out, content, "utf-8");
    return {
      content: [{ type: "text", text: `Report written to ${out}` }],
      details: { path: out },
    };
  },
};

const loader = new DefaultResourceLoader({
  cwd: targetRepo,
  systemPromptOverride: (base) =>
    `${base}\n\nYou are a codebase reconnaissance agent. Explore the target repository using ONLY the read-only tools (read, grep, find, ls). When finished, produce a structured report and persist it with save-report. Never modify any project file.`,
});
await loader.reload();

const { session } = await createAgentSession({
  cwd: targetRepo,
  tools: ["read", "grep", "find", "ls", "save-report"], // 只读 + 报告持久化
  customTools: [saveReport],
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt(
  `Reconnoiter this codebase and write a report covering:
1. Project purpose (from README / package.json)
2. Tech stack and dependencies
3. Directory layout overview
4. Entry points and key modules
5. Notable patterns or risks

Persist the report with save-report, then reply with a one-sentence summary.`,
);

console.log("\n\n[done] see RECON_REPORT.md in the target repo.");
