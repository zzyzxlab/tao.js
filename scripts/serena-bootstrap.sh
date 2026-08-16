#!/usr/bin/env bash
# Idempotent Serena bootstrap for any agent (Cursor, Claude Code, Codex, …).
# This repo uses the LSP backend only — never JetBrains.
#
#   bash scripts/serena-bootstrap.sh --check   # exit 0 if ready, 1 + instructions if not
#   bash scripts/serena-bootstrap.sh           # install uv + serena-agent and init LSP
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
fi

install_help() {
  cat >&2 <<'EOF'
Serena is not bootstrapped. This repo uses Serena as an agent LSP (language_backend: LSP).
Do not install it from an MCP/plugin marketplace, and do not use the JetBrains backend.

Run this from the repo root:

  bash scripts/serena-bootstrap.sh

That will:
  1. Install uv if needed (https://docs.astral.sh/uv/getting-started/installation/)
  2. Install Serena: uv tool install -p 3.13 serena-agent
  3. Initialise Serena with the LSP backend (serena init — do NOT pass -b JetBrains)

Then reload MCP in your client:
  - Cursor: Command Palette → MCP: Restart Servers (or restart Cursor)
  - Claude Code: /mcp → reconnect Serena
  - Other clients: restart the MCP server / session

Official docs: https://oraios.github.io/serena/
Quick start:   https://github.com/oraios/serena#quick-start
EOF
}

need() {
  if [[ "${CHECK_ONLY}" == true ]]; then
    install_help
    exit 1
  fi
}

if ! command -v uv >/dev/null 2>&1; then
  need
  echo "Installing uv…" >&2
  if command -v brew >/dev/null 2>&1; then
    brew install uv
  else
    curl -LsSf https://astral.sh/uv/install.sh | sh
  fi
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv installed but not on PATH. Add \$HOME/.local/bin to PATH and re-run." >&2
  exit 1
fi

SERENA=""
if command -v serena >/dev/null 2>&1; then
  SERENA="$(command -v serena)"
elif [[ -x "${HOME}/.local/bin/serena" ]]; then
  SERENA="${HOME}/.local/bin/serena"
fi

if [[ -z "${SERENA}" ]]; then
  need
  echo "Installing serena-agent (Python 3.13, LSP backend)…" >&2
  uv tool install -p 3.13 serena-agent
  SERENA="${HOME}/.local/bin/serena"
  if ! [[ -x "${SERENA}" ]] && command -v serena >/dev/null 2>&1; then
    SERENA="$(command -v serena)"
  fi
fi

if [[ -z "${SERENA}" || ! -x "${SERENA}" ]]; then
  echo "serena binary not found after install. Add \$HOME/.local/bin to PATH and re-run." >&2
  exit 1
fi

if [[ ! -f "${HOME}/.serena/serena_config.yml" ]]; then
  need
  echo "Initialising Serena (LSP backend; not JetBrains)…" >&2
  "${SERENA}" init
fi

PROJECT_YML="${ROOT}/.serena/project.yml"
if [[ ! -f "${PROJECT_YML}" ]]; then
  echo "Missing ${PROJECT_YML} — this file is versioned with the repo." >&2
  exit 1
fi

if ! grep -q '^language_backend:[[:space:]]*LSP[[:space:]]*$' "${PROJECT_YML}"; then
  echo "Refusing to proceed: ${PROJECT_YML} must set language_backend: LSP (never JetBrains)." >&2
  exit 1
fi

if grep -q '^language_backend:[[:space:]]*JetBrains[[:space:]]*$' "${HOME}/.serena/serena_config.yml" 2>/dev/null; then
  echo "Note: global ~/.serena/serena_config.yml is JetBrains; this repo overrides to LSP via project.yml and the MCP launcher." >&2
fi

echo "Serena is ready (LSP backend)."
echo "Binary: ${SERENA}"
echo "Project: ${PROJECT_YML}"
if [[ "${CHECK_ONLY}" != true ]]; then
  echo "Reload MCP in your client if this was the first install."
fi
