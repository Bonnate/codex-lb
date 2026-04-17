## 1. Spec
- [x] 1.1 Add a `runtime-portability` delta for Windows foreground server control scripts.

## 2. Implementation
- [x] 2.1 Add a Windows launcher that starts `codex-lb` in the foreground and manages a PID file.
- [x] 2.2 Add a Windows stop script that terminates the recorded server PID and handles stale PID files.
- [x] 2.3 Add Windows `.exe` launcher entry points and a build script.
- [x] 2.4 Clean an existing local launcher process or occupied port before starting a fresh server instance.
- [x] 2.5 Add repo hygiene for Windows launcher logs, PID artifacts, and cross-platform line endings.

## 3. Validation
- [x] 3.1 Add focused automated coverage for the launcher PID-file behavior.
- [x] 3.2 Run the targeted validation suite.
- [x] 3.3 Build the Windows launcher executables and verify the start/stop flow.
