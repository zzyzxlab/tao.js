#!/usr/bin/env bash
# Launch Serena MCP for this workspace (LSP backend, never JetBrains).
# Cursor: .cursor/mcp.json  Claude Code / others: .mcp.json
# SERENA_CONTEXT defaults to `ide` (Cursor and other IDEs). Claude Code sets
# SERENA_CONTEXT=claude-code in .mcp.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

CONTEXT="${SERENA_CONTEXT:-ide}"

if ! command -v serena >/dev/null 2>&1 && [[ ! -x "${HOME}/.local/bin/serena" ]]; then
  exec bash "${ROOT}/scripts/serena-bootstrap.sh" --check
fi

SERENA="$(command -v serena 2>/dev/null || true)"
if [[ -z "${SERENA}" ]]; then
  SERENA="${HOME}/.local/bin/serena"
fi

exec "${SERENA}" start-mcp-server \
  --context "${CONTEXT}" \
  --project "${ROOT}" \
  --language-backend LSP \
  --open-web-dashboard false \
  "$@"
