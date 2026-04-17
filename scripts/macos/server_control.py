from __future__ import annotations

import argparse
import atexit
import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Callable, Sequence

import uvicorn

from app.core.runtime_logging import build_log_config

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PID_FILE = REPO_ROOT / ".codex-lb-local.pid"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 2455


def read_pid_file(pid_file: Path) -> int | None:
    if not pid_file.exists():
        return None
    raw = pid_file.read_text(encoding="utf-8").strip()
    if not raw:
        return None
    return int(raw)


def write_pid_file(pid_file: Path, pid: int) -> None:
    pid_file.write_text(f"{pid}\n", encoding="utf-8")


def remove_pid_file(pid_file: Path) -> None:
    if pid_file.exists():
        pid_file.unlink()


def pid_is_running(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def terminate_pid(pid: int) -> int:
    if not pid_is_running(pid):
        return 0

    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        return 0
    except PermissionError:
        return 1

    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if not pid_is_running(pid):
            return 0
        time.sleep(0.1)

    try:
        os.kill(pid, signal.SIGKILL)
    except ProcessLookupError:
        return 0
    except PermissionError:
        return 1

    return 0 if not pid_is_running(pid) else 1


def list_listening_pids(port: int) -> list[int]:
    result = subprocess.run(
        ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode not in (0, 1):
        return []

    matched: list[int] = []
    for raw in result.stdout.splitlines():
        line = raw.strip()
        if not line:
            continue
        try:
            pid = int(line)
        except ValueError:
            continue
        if pid not in matched:
            matched.append(pid)
    return matched


def cleanup_existing_processes(pid_file: Path, port: int, terminate: Callable[[int], int] = terminate_pid) -> list[int]:
    terminated: list[int] = []

    recorded_pid = read_pid_file(pid_file)
    if recorded_pid is not None:
        if pid_is_running(recorded_pid):
            exit_code = terminate(recorded_pid)
            if exit_code != 0 and pid_is_running(recorded_pid):
                raise RuntimeError(f"Failed to stop existing codex-lb PID {recorded_pid}.")
            terminated.append(recorded_pid)
        remove_pid_file(pid_file)

    for pid in list_listening_pids(port):
        if pid == os.getpid() or pid in terminated:
            continue
        exit_code = terminate(pid)
        if exit_code != 0 and pid_is_running(pid):
            raise RuntimeError(f"Failed to free port {port} from PID {pid}.")
        terminated.append(pid)

    return terminated


def stop_server(pid_file: Path, terminate: Callable[[int], int] = terminate_pid) -> str:
    recorded_pid = read_pid_file(pid_file)
    if recorded_pid is None:
        return "not_running"

    if not pid_is_running(recorded_pid):
        remove_pid_file(pid_file)
        return "stale_pid_removed"

    exit_code = terminate(recorded_pid)
    if exit_code != 0 and pid_is_running(recorded_pid):
        raise RuntimeError(f"Failed to stop codex-lb PID {recorded_pid}.")
    remove_pid_file(pid_file)
    return "stopped"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="macOS foreground server control for codex-lb.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run codex-lb in the current console.")
    run_parser.add_argument("--pid-file", default=str(DEFAULT_PID_FILE))
    run_parser.add_argument("--host", default=os.getenv("HOST", DEFAULT_HOST))
    run_parser.add_argument("--port", type=int, default=int(os.getenv("PORT", str(DEFAULT_PORT))))
    run_parser.add_argument("--ssl-certfile", default=os.getenv("SSL_CERTFILE"))
    run_parser.add_argument("--ssl-keyfile", default=os.getenv("SSL_KEYFILE"))

    stop_parser = subparsers.add_parser("stop", help="Stop the launcher-managed codex-lb process.")
    stop_parser.add_argument("--pid-file", default=str(DEFAULT_PID_FILE))

    status_parser = subparsers.add_parser("status", help="Show launcher-managed codex-lb status.")
    status_parser.add_argument("--pid-file", default=str(DEFAULT_PID_FILE))
    return parser


def run_server(host: str, port: int, pid_file: Path, ssl_certfile: str | None, ssl_keyfile: str | None) -> int:
    if bool(ssl_certfile) ^ bool(ssl_keyfile):
        raise SystemExit("Both --ssl-certfile and --ssl-keyfile must be provided together.")

    terminated_pids = cleanup_existing_processes(pid_file, port)
    os.chdir(REPO_ROOT)
    os.environ["PORT"] = str(port)
    write_pid_file(pid_file, os.getpid())

    def _cleanup(*_args: object) -> None:
        remove_pid_file(pid_file)
        raise SystemExit(0)

    atexit.register(remove_pid_file, pid_file)
    signal.signal(signal.SIGINT, _cleanup)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _cleanup)

    print(f"Starting codex-lb in foreground on http://{host}:{port}")
    print(f"PID file: {pid_file}")
    if terminated_pids:
        print(f"Cleaned existing process(es): {', '.join(str(pid) for pid in terminated_pids)}")
    print("Press Ctrl+C to stop.")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        ssl_certfile=ssl_certfile,
        ssl_keyfile=ssl_keyfile,
        log_config=build_log_config(),
    )
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    pid_file = Path(args.pid_file).resolve()

    if args.command == "run":
        return run_server(args.host, args.port, pid_file, args.ssl_certfile, args.ssl_keyfile)

    if args.command == "stop":
        result = stop_server(pid_file)
        if result == "not_running":
            print(f"No launcher-managed codex-lb process found ({pid_file.name} is missing).")
        elif result == "stale_pid_removed":
            print(f"Removed stale PID file: {pid_file}")
        else:
            print(f"Stopped codex-lb and removed {pid_file.name}.")
        return 0

    recorded_pid = read_pid_file(pid_file)
    if recorded_pid is None:
        print("codex-lb is not running via the macOS launcher.")
        return 0
    if pid_is_running(recorded_pid):
        print(f"codex-lb is running with PID {recorded_pid}.")
        return 0
    remove_pid_file(pid_file)
    print(f"Removed stale PID file: {pid_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
