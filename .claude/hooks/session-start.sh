#!/bin/bash
# SessionStart hook: make sure workspace dependencies are installed so
# lint, typecheck, test and build work right away in cloud sessions.
set -euo pipefail

# Only cloud sessions. LOCAL (Windows) installs manually: `pnpm install`.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || npm install -g pnpm@10 >/dev/null
fi

# Install when node_modules is missing or the lockfile changed since the last install.
if [ ! -d node_modules ] || ! cmp -s pnpm-lock.yaml node_modules/.pnpm/lock.yaml; then
  pnpm install --frozen-lockfile
fi
