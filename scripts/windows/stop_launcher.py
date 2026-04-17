from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _repo_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parents[1]
    return Path(__file__).resolve().parents[2]


def main() -> int:
    repo_root = _repo_root()
    python = repo_root / ".venv" / "Scripts" / "python.exe"
    script = repo_root / "scripts" / "windows" / "server_control.py"
    if not python.exists():
        raise SystemExit(f"Missing Python launcher: {python}")
    if not script.exists():
        raise SystemExit(f"Missing server control script: {script}")
    return subprocess.call([str(python), str(script), "stop", *sys.argv[1:]], cwd=str(repo_root))


if __name__ == "__main__":
    raise SystemExit(main())