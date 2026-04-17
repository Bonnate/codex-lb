from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


def _load_server_control_module():
    module_path = Path(__file__).resolve().parents[2] / "scripts" / "windows" / "server_control.py"
    spec = importlib.util.spec_from_file_location("server_control", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


server_control = _load_server_control_module()


def test_build_parser_accepts_pid_file_after_subcommand() -> None:
    parser = server_control.build_parser()

    run_args = parser.parse_args(["run", "--pid-file", "custom.pid"])
    stop_args = parser.parse_args(["stop", "--pid-file", "custom.pid"])
    status_args = parser.parse_args(["status", "--pid-file", "custom.pid"])

    assert run_args.pid_file == "custom.pid"
    assert stop_args.pid_file == "custom.pid"
    assert status_args.pid_file == "custom.pid"


def test_list_listening_pids_parses_netstat_output(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Result:
        returncode = 0
        stdout = "\n".join(
            [
                "  TCP    127.0.0.1:2456       0.0.0.0:0      LISTENING       3210",
                "  TCP    0.0.0.0:2455         0.0.0.0:0      LISTENING       1111",
                "  TCP    [::]:2456            [::]:0         LISTENING       6543",
            ]
        )

    monkeypatch.setattr(server_control.subprocess, "run", lambda *args, **kwargs: _Result())

    assert server_control.list_listening_pids(2456) == [3210, 6543]


def test_pid_is_running_uses_tasklist_on_windows(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Result:
        returncode = 0
        stdout = '"python.exe","32612","Console","1","12,000 K"'

    monkeypatch.setattr(server_control.os, "name", "nt")
    monkeypatch.setattr(server_control.subprocess, "run", lambda *args, **kwargs: _Result())

    assert server_control.pid_is_running(32612) is True


def test_cleanup_existing_processes_stops_recorded_pid_and_port_pids(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pid_file = tmp_path / "codex.pid"
    pid_file.write_text("1234\n", encoding="utf-8")
    monkeypatch.setattr(server_control, "pid_is_running", lambda pid: True)
    monkeypatch.setattr(server_control, "list_listening_pids", lambda port: [1234, 4321, 5432])

    seen: list[int] = []

    def _terminate(pid: int) -> int:
        seen.append(pid)
        return 0

    terminated = server_control.cleanup_existing_processes(pid_file, 2456, terminate=_terminate)

    assert terminated == [1234, 4321, 5432]
    assert seen == [1234, 4321, 5432]
    assert not pid_file.exists()


def test_ensure_no_active_pid_removes_stale_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pid_file = tmp_path / "codex.pid"
    pid_file.write_text("99999\n", encoding="utf-8")
    monkeypatch.setattr(server_control, "pid_is_running", lambda pid: False)

    server_control.ensure_no_active_pid(pid_file)

    assert not pid_file.exists()


def test_ensure_no_active_pid_rejects_running_process(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pid_file = tmp_path / "codex.pid"
    pid_file.write_text("12345\n", encoding="utf-8")
    monkeypatch.setattr(server_control, "pid_is_running", lambda pid: True)

    with pytest.raises(RuntimeError, match="already running"):
        server_control.ensure_no_active_pid(pid_file)


def test_stop_server_removes_stale_pid_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pid_file = tmp_path / "codex.pid"
    pid_file.write_text("45678\n", encoding="utf-8")
    monkeypatch.setattr(server_control, "pid_is_running", lambda pid: False)

    result = server_control.stop_server(pid_file)

    assert result == "stale_pid_removed"
    assert not pid_file.exists()


def test_stop_server_terminates_recorded_pid(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    pid_file = tmp_path / "codex.pid"
    pid_file.write_text("24680\n", encoding="utf-8")
    seen: list[int] = []
    monkeypatch.setattr(server_control, "pid_is_running", lambda pid: True)

    def _terminate(pid: int) -> int:
        seen.append(pid)
        return 0

    result = server_control.stop_server(pid_file, terminate=_terminate)

    assert result == "stopped"
    assert seen == [24680]
    assert not pid_file.exists()
