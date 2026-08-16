# Claude Code

Follow **[AGENTS.md](AGENTS.md)** — that is this repo’s agent contract (Nx + pnpm monorepo for `@tao.js/*`).

## Serena (agent LSP)

At the start of a coding session:

```sh
bash scripts/serena-bootstrap.sh --check
```

If that fails:

```sh
bash scripts/serena-bootstrap.sh
```

Then reconnect MCP (`/mcp`). Backend is **LSP** only — never JetBrains.

Project MCP lives in `.mcp.json`. Session hooks live in `.claude/settings.json`. The shared skill is `.agents/skills/serena` (also linked from `.claude/skills/serena`).
