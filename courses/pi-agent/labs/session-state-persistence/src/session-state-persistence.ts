import { Agent, type AgentEvent, type AgentMessage, type AgentTool } from "@earendil-works/pi-agent-core";
import { Type, createModels } from "@earendil-works/pi-ai";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai/providers/faux";

// ─────────────────────────────────────────────────────────────
// 1. A simple tool whose result becomes part of the persisted
//    transcript — toolResult messages persist exactly like user
//    and assistant messages.
// ─────────────────────────────────────────────────────────────

const rememberParameters = Type.Object({ fact: Type.String() });

const rememberTool: AgentTool<typeof rememberParameters> = {
  name: "remember",
  label: "Remember",
  description: "Store a fact the user wants to remember.",
  parameters: rememberParameters,
  execute: async (_toolCallId, { fact }) => ({
    content: [{ type: "text", text: `Stored: ${fact}` }],
    details: { fact },
  }),
};

// ─────────────────────────────────────────────────────────────
// 2. One shared faux provider. Responses are consumed in order:
//    session 1 uses [0] and [1], session 2 uses [2].
// ─────────────────────────────────────────────────────────────

const faux = fauxProvider({ tokensPerSecond: 1000 });
faux.setResponses([
  // Session 1, turn 1: model calls the remember tool
  fauxAssistantMessage(
    fauxToolCall("remember", { fact: "Vernon prefers TypeScript" }, { id: "note-1" }),
    { stopReason: "toolUse" },
  ),
  // Session 1, turn 2: model confirms after seeing the tool result
  fauxAssistantMessage("Got it — I've noted that you prefer TypeScript."),
  // Session 2: the restored agent recalls the persisted fact
  fauxAssistantMessage("You told me earlier that you prefer TypeScript."),
]);

const models = createModels();
models.setProvider(faux.provider);

function makeAgent(initialMessages: AgentMessage[] = []): Agent {
  return new Agent({
    initialState: {
      systemPrompt: "You are a note-taking assistant. Remember facts the user tells you.",
      model: faux.getModel(),
      tools: [rememberTool],
      messages: initialMessages,
    },
    streamFn: models.streamSimple.bind(models),
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Event stream capture — record every event type, in order,
//    across both sessions.
// ─────────────────────────────────────────────────────────────

const eventTypes: AgentEvent["type"][] = [];

function watch(agent: Agent): void {
  agent.subscribe((event) => {
    eventTypes.push(event.type);
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Session 1 — first run, produces the transcript we persist.
// ─────────────────────────────────────────────────────────────

const agentA = makeAgent();
watch(agentA);
await agentA.prompt("Remember that I prefer TypeScript.");

const rolesA = agentA.state.messages.map((m) => m.role);
console.log(`[session-1 roles] ${rolesA.join(" -> ")}`);

// ─────────────────────────────────────────────────────────────
// 5. Persist: serialize the transcript (+ minimal config) to JSON.
//    This is the durable snapshot a session backend would store.
// ─────────────────────────────────────────────────────────────

const snapshot = JSON.stringify({
  systemPrompt: agentA.state.systemPrompt,
  modelId: agentA.state.model.id,
  messages: agentA.state.messages,
});

console.log(`[snapshot] ${agentA.state.messages.length} messages, ${snapshot.length} bytes`);

// ─────────────────────────────────────────────────────────────
// 6. Restore: build a brand-new Agent from the snapshot. This is a
//    "fresh process" — it knows nothing except what we hand it.
// ─────────────────────────────────────────────────────────────

const restored = JSON.parse(snapshot) as { messages: AgentMessage[] };
const agentB = makeAgent(restored.messages);

const rolesRestored = agentB.state.messages.map((m) => m.role);
console.log(`[restored roles] ${rolesRestored.join(" -> ")}`);

// ─────────────────────────────────────────────────────────────
// 7. Session 2 — continue the conversation from the restored state.
// ─────────────────────────────────────────────────────────────

watch(agentB);
await agentB.prompt("What did I tell you about my language preference?");

const rolesB = agentB.state.messages.map((m) => m.role);
console.log(`[session-2 roles] ${rolesB.join(" -> ")}`);
console.log(`[events] ${eventTypes.join(" -> ")}`);
console.log(`[event types] ${[...new Set(eventTypes)].join(" -> ")}`);
console.log(`[provider calls] ${faux.state.callCount}`);

// ─────────────────────────────────────────────────────────────
// 8. Verify.
// ─────────────────────────────────────────────────────────────

if (rolesA.join(",") !== "user,assistant,toolResult,assistant") {
  throw new Error(`Unexpected session-1 flow: ${rolesA.join(",")}`);
}
if (rolesRestored.join(",") !== "user,assistant,toolResult,assistant") {
  throw new Error(`Restore mismatch: ${rolesRestored.join(",")}`);
}
if (rolesB.join(",") !== "user,assistant,toolResult,assistant,user,assistant") {
  throw new Error(`Unexpected session-2 flow: ${rolesB.join(",")}`);
}
if (faux.state.callCount !== 3) {
  throw new Error(`Expected 3 model turns total, got ${faux.state.callCount}`);
}

const requiredEvents: AgentEvent["type"][] = [
  "agent_start",
  "turn_start",
  "message_start",
  "message_update",
  "message_end",
  "tool_execution_start",
  "tool_execution_end",
  "turn_end",
  "agent_end",
];
for (const t of requiredEvents) {
  if (!eventTypes.includes(t)) {
    throw new Error(`Missing event type: ${t}`);
  }
}
console.log("[verify] all assertions passed");
