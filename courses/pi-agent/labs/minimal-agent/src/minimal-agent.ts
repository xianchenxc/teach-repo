import { Agent, type AgentEvent, type AgentTool } from "@earendil-works/pi-agent-core";
import { Type, createModels } from "@earendil-works/pi-ai";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai/providers/faux";

const multiplyParameters = Type.Object({
  a: Type.Number(),
  b: Type.Number(),
});

const multiplyTool: AgentTool<typeof multiplyParameters> = {
  name: "multiply",
  label: "Multiply",
  description: "Multiply two numbers",
  parameters: multiplyParameters,
  execute: async (_toolCallId, { a, b }) => ({
    content: [{ type: "text", text: String(a * b) }],
    details: { a, b },
  }),
};

const faux = fauxProvider({ tokensPerSecond: 1000 });
faux.setResponses([
  fauxAssistantMessage(fauxToolCall("multiply", { a: 6, b: 7 }, { id: "call-1" }), {
    stopReason: "toolUse",
  }),
  fauxAssistantMessage("6 × 7 = 42. The tool result has completed the loop."),
]);

const models = createModels();
models.setProvider(faux.provider);

const agent = new Agent({
  initialState: {
    systemPrompt: "Use tools when needed, then answer concisely.",
    model: faux.getModel(),
    tools: [multiplyTool],
  },
  streamFn: models.streamSimple.bind(models),
});

const visibleEvents = new Set<AgentEvent["type"]>([
  "agent_start",
  "turn_start",
  "tool_execution_start",
  "tool_execution_end",
  "turn_end",
  "agent_end",
]);

agent.subscribe((event) => {
  if (visibleEvents.has(event.type)) console.log(`[event] ${event.type}`);
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("What is 6 multiplied by 7?");

const roles = agent.state.messages.map((message) => message.role);
console.log(`\n[roles] ${roles.join(" -> ")}`);
console.log(`[provider calls] ${faux.state.callCount}`);

if (roles.join(",") !== "user,assistant,toolResult,assistant") {
  throw new Error(`Unexpected message flow: ${roles.join(",")}`);
}
if (faux.state.callCount !== 2) {
  throw new Error(`Expected two model turns, got ${faux.state.callCount}`);
}
