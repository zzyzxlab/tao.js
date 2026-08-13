---
name: serena
description: Bootstrap and use Serena as this repo's agent LSP (symbolic find, overview, references, rename). Use at the start of a coding session, when Serena MCP tools are missing, when navigating or editing code symbols, or when the user mentions Serena, LSP, or agent language intelligence.
---

# Serena (agent LSP)

Canonical bootstrap for every agent. Client adapters (Cursor rules, Claude hooks) point here.

Backend is **LSP**. Never JetBrains (`language_backend: JetBrains` or `serena init -b JetBrains`).

## Session start

1. Run `bash scripts/serena-bootstrap.sh --check` from the repo root.
2. If it exits non-zero, run `bash scripts/serena-bootstrap.sh` (installs `uv` + `serena-agent`, then `serena init` with LSP).
3. Tell the user to reload MCP (Cursor: MCP Restart Servers; Claude Code: `/mcp` reconnect).
4. Prefer Serena symbol tools over grep/full-file reads for code structure.

Do not install Serena from an MCP/plugin marketplace. Do not skip a failed check silently.

## After install

- Project config: `.serena/project.yml` (`language_backend: LSP`, TypeScript LS for JS+TS).
- Cursor MCP: `.cursor/mcp.json` → `scripts/serena-mcp.sh` (`SERENA_CONTEXT` defaults to `ide`).
- Claude Code MCP: `.mcp.json` → same launcher with `SERENA_CONTEXT=claude-code`.
- Universal contract: `AGENTS.md` § Serena.

Keep using Nx MCP for Nx graph/docs/generators. Source + tests remain the API source of truth.
