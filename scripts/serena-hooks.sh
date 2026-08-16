#!/usr/bin/env bash
# PATH-safe wrapper so Claude Code hooks can find `serena-hooks` when the
# GUI client does not inherit ~/.local/bin.
set -euo pipefail

export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

if ! command -v serena-hooks >/dev/null 2>&1; then
  echo "serena-hooks not found; run bash scripts/serena-bootstrap.sh" >&2
  exit 0
fi

exec serena-hooks "$@"
