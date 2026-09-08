import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { registerFauxProvider, streamSimple } from "@earendil-works/pi-ai/compat";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai/providers/faux";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";

// ─────────────────────────────────────────────────────────────
// 零成本验证：代码库侦察 Agent 的接线（SDK + 自定义工具 + 报告持久化）
// 用脚本化 faux 模型跑一轮，证明与 recon-agent.ts 相同的接线真实可用。
// ─────────────────────────────────────────────────────────────

// 1. 临时「仓库」
const temp = mkdtempSync(join(tmpdir(), "pi-recon-"));
mkdirSync(join(temp, "src"), { recursive: true });
writeFileSync(join(temp, "README.md"), "# Fake Project\nA toy repo for the recon demo.\n");
writeFileSync(join(temp, "src", "index.ts"), "export const answer = 42;\n");

// 2. 自定义工具：报告持久化
const saveReport: ToolDefinition = {
  name: "save-report",
  label: "Save Report",
  description: "Persist the report to RECON_REPORT.md in the target repo.",
  parameters: Type.Object({ content: Type.String() }),
  execute: async (_toolCallId, { content }) => {
    const out = resolve(temp, "RECON_REPORT.md");
    writeFileSync(out, content, "utf-8");
    return {
      content: [{ type: "text", text: `Report written to ${out}` }],
      details: { path: out },
    };
  },
};

// 3. 脚本化模型（零 API 成本）
const faux = registerFauxProvider();
const fauxModel = faux.getModel();
faux.setResponses([
  fauxAssistantMessage(
    fauxToolCall("save-report", { content: "# Recon Report\n- purpose: toy project\n- stack: TypeScript" }, { id: "save-1" }),
    { stopReason: "toolUse" },
  ),
  fauxAssistantMessage("Reconnaissance complete. Report saved."),
]);

// 4. ModelRuntime：注入 faux 模型
const runtime = await ModelRuntime.create({ modelsPath: null, allowModelNetwork: false });
runtime.registerProvider(fauxModel.provider, {
  api: faux.api,
  baseUrl: fauxModel.baseUrl,
  apiKey: "faux-key",
  streamSimple,
  models: [
    {
      id: fauxModel.id,
      name: fauxModel.name,
      api: fauxModel.api,
      baseUrl: fauxModel.baseUrl,
      reasoning: fauxModel.reasoning,
      input: fauxModel.input,
      cost: fauxModel.cost,
      contextWindow: fauxModel.contextWindow,
      maxTokens: fauxModel.maxTokens,
    },
  ],
});

// 5. SDK：与 recon-agent.ts 相同的接线
const loader = new DefaultResourceLoader({
  cwd: temp,
  agentDir: join(temp, "agent"),
  systemPromptOverride: (base) => `${base}\n\nYou are a codebase reconnaissance agent.`,
});
await loader.reload();

const { session } = await createAgentSession({
  model: fauxModel,
  modelRuntime: runtime,
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
  settingsManager: SettingsManager.inMemory(),
  tools: ["save-report"], // allowlist：本演示只启用报告持久化工具
  customTools: [saveReport],
});

await session.prompt("Reconnoiter this repo and save the report.");

const roles = session.messages.map((m) => m.role);
console.log(`[roles] ${roles.join(" -> ")}`);
console.log(`[provider calls] ${faux.state.callCount}`);

const reportPath = resolve(temp, "RECON_REPORT.md");
console.log(`[report exists] ${existsSync(reportPath)}`);
console.log(`[report] ${readFileSync(reportPath, "utf-8").replace(/\n/g, " | ")}`);

// ─────────────────────────────────────────────────────────────
// 6. Verify
// ─────────────────────────────────────────────────────────────

if (roles.join(",") !== "user,assistant,toolResult,assistant") {
  throw new Error(`Unexpected roles: ${roles.join(",")}`);
}
if (!existsSync(reportPath)) {
  throw new Error("Report was not persisted");
}
const reportText = readFileSync(reportPath, "utf-8");
if (!reportText.includes("# Recon Report") || !reportText.includes("TypeScript")) {
  throw new Error(`Report content wrong: ${reportText}`);
}
if (faux.state.callCount !== 2) {
  throw new Error(`Expected 2 model turns, got ${faux.state.callCount}`);
}

session.dispose();
faux.unregister();
console.log("[verify] all assertions passed");
