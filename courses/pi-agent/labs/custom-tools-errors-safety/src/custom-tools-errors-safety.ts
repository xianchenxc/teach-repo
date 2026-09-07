import { Agent, type AgentEvent, type AgentTool } from "@earendil-works/pi-agent-core";
import { Type, createModels } from "@earendil-works/pi-ai";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai/providers/faux";

// ─────────────────────────────────────────────────────────────
// 1. Custom tools
//    A tool is a schema (TypeBox) + an `execute` function.
//    Contract: throw on failure — do NOT encode errors in `content`.
// ─────────────────────────────────────────────────────────────

const divideParameters = Type.Object({
  a: Type.Number(),
  b: Type.Number(),
});

const divideTool: AgentTool<typeof divideParameters> = {
  name: "divide",
  label: "Divide",
  description: "Divide a by b. Throws if b is zero.",
  parameters: divideParameters,
  execute: async (_toolCallId, { a, b }) => {
    if (b === 0) {
      // Error path: throw. The runtime converts this into an
      // error tool result with isError=true (see agent-loop.ts).
      throw new Error("Division by zero");
    }
    return {
      content: [{ type: "text", text: String(a / b) }],
      details: { a, b, quotient: a / b },
    };
  },
};

const shellParameters = Type.Object({
  command: Type.String(),
});

const shellTool: AgentTool<typeof shellParameters> = {
  name: "shell",
  label: "Shell",
  description: "Run a shell command. Allowlist enforced by beforeToolCall.",
  parameters: shellParameters,
  execute: async (_toolCallId, { command }) => ({
    content: [{ type: "text", text: `Executed: ${command}` }],
    details: { command },
  }),
};

// ─────────────────────────────────────────────────────────────
// 2. Faux provider — scripted, deterministic model turns.
//    Each array entry is consumed by one LLM call, in order.
// ─────────────────────────────────────────────────────────────

const faux = fauxProvider({ tokensPerSecond: 1000 });
faux.setResponses([
  // Turn 1: valid call, succeeds
  fauxAssistantMessage(fauxToolCall("divide", { a: 10, b: 2 }, { id: "call-1" }), { stopReason: "toolUse" }),
  // Turn 2: b=0 → the tool THROWS → error tool result
  fauxAssistantMessage(fauxToolCall("divide", { a: 10, b: 0 }, { id: "call-2" }), { stopReason: "toolUse" }),
  // Turn 3: model "sees" the error and retries with valid args
  fauxAssistantMessage(fauxToolCall("divide", { a: 10, b: 5 }, { id: "call-3" }), { stopReason: "toolUse" }),
  // Turn 4: dangerous command → blocked by beforeToolCall
  fauxAssistantMessage(fauxToolCall("shell", { command: "rm -rf /" }, { id: "call-4" }), { stopReason: "toolUse" }),
  // Turn 5: final answer, no tool call → loop ends
  fauxAssistantMessage("Done: recovered from divide-by-zero and a blocked shell command."),
]);

const models = createModels();
models.setProvider(faux.provider);

// ─────────────────────────────────────────────────────────────
// 3. Safety hooks
//    beforeToolCall: gate execution (allow/block) BEFORE execute runs.
//    afterToolCall:  inspect/override the result AFTER execute runs.
// ─────────────────────────────────────────────────────────────

const SHELL_ALLOWLIST = new Set(["ls", "pwd"]);

const agent = new Agent({
  initialState: {
    systemPrompt: "Use tools when needed. Recover from errors by retrying.",
    model: faux.getModel(),
    tools: [divideTool, shellTool],
  },
  streamFn: models.streamSimple.bind(models),

  // Runs after arguments are validated, before execute().
  // Return { block: true, reason } to prevent execution.
  beforeToolCall: async ({ toolCall, args }) => {
    if (toolCall.name === "shell") {
      const command = (args as { command: string }).command;
      if (!SHELL_ALLOWLIST.has(command)) {
        return { block: true, reason: `Command "${command}" is not in the allowlist` };
      }
    }
    return undefined; // allow
  },

  // Runs after execute() succeeds or throws, before the result is finalized.
  // Only fires for tools that actually executed (not blocked ones).
  afterToolCall: async ({ toolCall, result, isError }) => {
    console.log(`[afterToolCall] ${toolCall.name} isError=${isError}`);
    if (!isError) {
      // Post-execution audit: rewrite content + details in full.
      return {
        content: [...result.content, { type: "text", text: " [audited]" }],
        details: { ...(result.details as object), audited: true },
      };
    }
    return undefined;
  },
});

// ─────────────────────────────────────────────────────────────
// 4. Observe the run
// ─────────────────────────────────────────────────────────────

agent.subscribe((event) => {
  if (event.type === "tool_execution_end") {
    console.log(`[tool_result] ${event.toolName} isError=${event.isError}`);
  }
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Do some arithmetic, then run a command.");

// ─────────────────────────────────────────────────────────────
// 5. Verify
// ─────────────────────────────────────────────────────────────

const messages = agent.state.messages;
const roles = messages.map((m) => m.role);
console.log(`\n[roles] ${roles.join(" -> ")}`);
console.log(`[provider calls] ${faux.state.callCount}`);

type ToolResult = { role: string; toolName: string; isError?: boolean; content: { text: string }[]; details?: Record<string, unknown> };
const toolResults = messages.filter((m) => m.role === "toolResult") as ToolResult[];

const errorResults = toolResults.filter((m) => m.isError);
const errorTexts = errorResults.map((m) => m.content.map((c) => c.text).join(""));
console.log(`[errors] ${JSON.stringify(errorTexts)}`);

const auditedResults = toolResults.filter((m) => !m.isError && m.details?.audited);
console.log(`[audited] ${auditedResults.length}`);

// Expected message flow (5 turns → 10 messages).
const expectedRoles = "user,assistant,toolResult,assistant,toolResult,assistant,toolResult,assistant,toolResult,assistant";
if (roles.join(",") !== expectedRoles) {
  throw new Error(`Unexpected message flow:\n  got      ${roles.join(",")}\n  expected ${expectedRoles}`);
}
if (faux.state.callCount !== 5) {
  throw new Error(`Expected 5 model turns, got ${faux.state.callCount}`);
}
if (errorResults.length !== 2) {
  throw new Error(`Expected 2 error tool results, got ${errorResults.length}`);
}
if (!errorTexts.some((t) => t.includes("Division by zero"))) {
  throw new Error("Missing division-by-zero error in results");
}
if (!errorTexts.some((t) => t.includes("not in the allowlist"))) {
  throw new Error("Missing allowlist-block reason in results");
}
if (auditedResults.length !== 2) {
  throw new Error(`Expected 2 audited results, got ${auditedResults.length}`);
}
console.log("[verify] all assertions passed");
