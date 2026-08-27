# Minimal PI Agent Lab

A deterministic, zero-cost PI Agent example. It uses PI's official faux provider to exercise the real `Agent` runtime, streaming events, tool argument validation, tool execution, `toolResult` insertion, and the second LLM turn without an API key.

```bash
npm install --ignore-scripts
npm start
```

Expected final line:

```text
[assistant] 6 × 7 = 42. The tool result has completed the loop.
```
