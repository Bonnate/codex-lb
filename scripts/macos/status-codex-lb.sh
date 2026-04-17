#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
PYTHON="${REPO_ROOT}/.venv/bin/python"

if [[ ! -x "${PYTHON}" ]]; then
  echo "Missing Python launcher: ${PYTHON}"
  echo "Run 'uv sync' first."
  exit 1
fi

cd "${REPO_ROOT}"
exec "${PYTHON}" "${REPO_ROOT}/scripts/macos/server_control.py" status "$@"
