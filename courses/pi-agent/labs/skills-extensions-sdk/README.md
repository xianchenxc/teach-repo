# Skills, Extensions & Coding Agent SDK Lab

Zero-cost, deterministic demonstration of PI's three extension mechanisms, run through the public `@earendil-works/pi-coding-agent` SDK:

1. **Skills** — `SKILL.md` files with frontmatter, discovered from a project `.pi/skills/` dir and rendered into the system prompt as an `<available_skills>` XML block.
2. **Extensions** — an inline `ExtensionFactory` that observes agent events (`pi.on`) and registers a custom tool (`pi.registerTool`).
3. **SDK** — `createAgentSession()` ties skills + extensions + a scripted faux model into one runnable session.

```bash
npm install --ignore-scripts
npm start
```

Expected final lines:

```text
[skills] browser-testing, code-review
[skill diagnostics] 1
[skills prompt] <available_skills> XML block with 2 skills

[roles] user -> assistant -> toolResult -> assistant
[extension events] agent_start -> tool_call:shout -> agent_end:4
[provider calls] 2
[verify] all assertions passed
```

The `internal-only` skill has no `description`, so it is skipped and emits one diagnostic — demonstrating that `description` is the one required frontmatter field.
