# Session State & Persistence Lab

Zero-cost, deterministic PI Agent example. Shows the three things a durable session needs:

1. **AgentState** — the runtime transcript lives in `agent.state.messages` (plus `systemPrompt`, `model`, `tools`).
2. **Event stream** — the full `AgentEvent` lifecycle (`agent_start` … `agent_end`).
3. **Persistence** — serialize the transcript to JSON, restore it into a brand-new `Agent`, and continue the conversation.

```bash
npm install --ignore-scripts
npm start
```

Expected final lines:

```text
[session-1 roles] user -> assistant -> toolResult -> assistant
[snapshot] 4 messages, <N> bytes
[restored roles] user -> assistant -> toolResult -> assistant
[session-2 roles] user -> assistant -> toolResult -> assistant -> user -> assistant
[events] <full event sequence, incl. per-delta message_update>
[event types] agent_start -> turn_start -> message_start -> message_end -> message_update -> tool_execution_start -> tool_execution_end -> turn_end -> agent_end
[provider calls] 3
[verify] all assertions passed
```
