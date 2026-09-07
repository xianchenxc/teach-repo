# Custom Tools, Errors & Safety Hooks Lab

Zero-cost, deterministic PI Agent example. Extends the minimal agent with three mechanisms from `pi-agent-core`:

1. **Custom tool** — a `divide` tool with a TypeBox schema whose `execute` **throws** on invalid input.
2. **Error handling** — a thrown error becomes an error `toolResult` (`isError: true`) the model can see and retry.
3. **Safety hooks** — `beforeToolCall` blocks a dangerous `shell` command; `afterToolCall` audits/rewrites successful results.

```bash
npm install --ignore-scripts
npm start
```

Expected final lines:

```text
[roles] user -> assistant -> toolResult -> assistant -> toolResult -> assistant -> toolResult -> assistant -> toolResult -> assistant
[provider calls] 5
[errors] ["Division by zero","Command \"rm -rf /\" is not in the allowlist"]
[audited] 2
[verify] all assertions passed
```
