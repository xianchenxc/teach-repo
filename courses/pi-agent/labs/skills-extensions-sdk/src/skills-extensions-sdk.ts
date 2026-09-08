import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { registerFauxProvider, streamSimple } from "@earendil-works/pi-ai/compat";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai/providers/faux";
import {
  createAgentSession,
  DefaultResourceLoader,
  formatSkillsForPrompt,
  loadSkillsFromDir,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type InlineExtension,
} from "@earendil-works/pi-coding-agent";

// ─────────────────────────────────────────────────────────────
// 0. A disposable working tree (project + empty global agent dir).
// ─────────────────────────────────────────────────────────────

const temp = mkdtempSync(join(tmpdir(), "pi-sdk-"));
const agentDir = join(temp, "agent");
mkdirSync(agentDir, { recursive: true });

// ─────────────────────────────────────────────────────────────
// 1. Skills — SKILL.md files with frontmatter, discovered + formatted.
//    Skills are specialized instructions injected into the system prompt.
// ─────────────────────────────────────────────────────────────

const skillsDir = join(temp, ".pi", "skills");
mkdirSync(join(skillsDir, "browser-testing"), { recursive: true });
mkdirSync(join(skillsDir, "code-review"), { recursive: true });
mkdirSync(join(skillsDir, "internal-only"), { recursive: true });

writeFileSync(
  join(skillsDir, "browser-testing", "SKILL.md"),
  `---
name: browser-testing
description: Drive a headless browser to exercise and verify web UIs.
---

# Browser Testing
Use Playwright to open pages, click, and assert.`,
);

writeFileSync(
  join(skillsDir, "code-review", "SKILL.md"),
  `---
name: code-review
description: Review diffs for correctness, security, and style.
---

# Code Review
Inspect the diff hunks and report issues with line anchors.`,
);

// No description → this skill must be SKIPPED (description is required).
writeFileSync(
  join(skillsDir, "internal-only", "SKILL.md"),
  `---
name: internal-only
---

# Internal
Has no description, so it should be skipped.`,
);

const discovered = loadSkillsFromDir({ dir: skillsDir, source: "project" });
console.log(`[skills] ${discovered.skills.map((s) => s.name).join(", ")}`);
console.log(`[skill diagnostics] ${discovered.diagnostics.length}`);

const promptBlock = formatSkillsForPrompt(discovered.skills);
console.log("[skills prompt]");
console.log(promptBlock);

// ─────────────────────────────────────────────────────────────
// 2. Extensions — an inline ExtensionFactory that registers a custom
//    tool AND observes agent events. Extensions are TypeScript modules
//    exporting `default (pi: ExtensionAPI) => { ... }`.
// ─────────────────────────────────────────────────────────────

const extensionEvents: string[] = [];

const myExtension: InlineExtension = (pi) => {
  pi.on("agent_start", () => extensionEvents.push("agent_start"));
  pi.on("tool_call", (event) => extensionEvents.push(`tool_call:${event.toolName}`));
  pi.on("agent_end", (event) => extensionEvents.push(`agent_end:${event.messages.length}`));

  pi.registerTool({
    name: "shout",
    label: "Shout",
    description: "Return the given text uppercased.",
    parameters: Type.Object({ text: Type.String() }),
    execute: async (_toolCallId: string, params: { text: string }) => ({
      content: [{ type: "text", text: params.text.toUpperCase() }],
      details: { text: params.text },
    }),
  });
};

// ─────────────────────────────────────────────────────────────
// 3. Faux provider — scripted, deterministic model turns (zero API cost).
// ─────────────────────────────────────────────────────────────

const faux = registerFauxProvider();
const fauxModel = faux.getModel();
faux.setResponses([
  fauxAssistantMessage(fauxToolCall("shout", { text: "hello from extension" }, { id: "call-1" }), {
    stopReason: "toolUse",
  }),
  fauxAssistantMessage("Done: the extension tool echoed HELLO FROM EXTENSION"),
]);

// ─────────────────────────────────────────────────────────────
// 4. ModelRuntime — register the faux model so the SDK can resolve it.
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// 5. SDK — createAgentSession() ties skills + extensions + model together.
// ─────────────────────────────────────────────────────────────

const loader = new DefaultResourceLoader({
  cwd: temp,
  agentDir,
  extensionFactories: [myExtension],
});
await loader.reload();

const { session } = await createAgentSession({
  model: fauxModel,
  modelRuntime: runtime,
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
  settingsManager: SettingsManager.inMemory(),
  tools: ["shout"], // allowlist includes the extension's custom tool
});

// ─────────────────────────────────────────────────────────────
// 6. Run + observe.
// ─────────────────────────────────────────────────────────────

await session.prompt("Shout the phrase.");

const roles = session.messages.map((m) => m.role);
console.log(`\n[roles] ${roles.join(" -> ")}`);
console.log(`[extension events] ${extensionEvents.join(" -> ")}`);
console.log(`[provider calls] ${faux.state.callCount}`);

// ─────────────────────────────────────────────────────────────
// 7. Verify.
// ─────────────────────────────────────────────────────────────

const skillNames = discovered.skills.map((s) => s.name).join(",");
if (skillNames !== "browser-testing,code-review") {
  throw new Error(`Skill discovery mismatch: ${skillNames}`);
}
if (!promptBlock.includes("<available_skills>") || !promptBlock.includes("browser-testing")) {
  throw new Error("Skill prompt formatting failed");
}

if (roles.join(",") !== "user,assistant,toolResult,assistant") {
  throw new Error(`Unexpected roles: ${roles.join(",")}`);
}
if (!extensionEvents.includes("agent_start") || !extensionEvents.includes("tool_call:shout") || !extensionEvents.some((e) => e.startsWith("agent_end"))) {
  throw new Error(`Missing extension events: ${extensionEvents.join(" -> ")}`);
}
if (faux.state.callCount !== 2) {
  throw new Error(`Expected 2 model turns, got ${faux.state.callCount}`);
}

const toolResult = session.messages.find((m) => m.role === "toolResult") as { content: { text: string }[] };
const resultText = toolResult.content.map((c) => c.text).join("");
if (!resultText.includes("HELLO FROM EXTENSION")) {
  throw new Error(`Extension tool result wrong: ${resultText}`);
}

session.dispose();
faux.unregister();
console.log("[verify] all assertions passed");
