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

HOST_VALUE="${HOST:-127.0.0.1}"
PORT_VALUE="${PORT:-2455}"

if [[ -z "${SSL_CERT_FILE:-}" ]]; then
  CERT_PATH="$(${PYTHON} -c 'import certifi; print(certifi.where())' 2>/dev/null || true)"
  if [[ -n "${CERT_PATH}" && -f "${CERT_PATH}" ]]; then
    export SSL_CERT_FILE="${CERT_PATH}"
  fi
fi

cd "${REPO_ROOT}"
exec "${PYTHON}" "${REPO_ROOT}/scripts/macos/server_control.py" run --host "${HOST_VALUE}" --port "${PORT_VALUE}" "$@"
