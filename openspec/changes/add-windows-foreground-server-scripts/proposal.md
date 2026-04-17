## Why

Local Windows development currently depends on ad hoc terminal commands to start and stop the server. That makes it easy to accidentally launch the app in the background or lose track of which process should be stopped later.

## What Changes

- Add a Windows foreground launcher that runs `codex-lb` in the current console and records a PID file while it is active.
- Add a Windows stop script that terminates the PID recorded by the launcher and clears stale PID files when needed.
- Add Windows `.exe` launcher entry points and a repeatable build script so operators can open/close the local server without invoking Python manually.
- Make the launcher clean up an existing local launcher process or any listener already occupying the selected port before starting again.
- Keep the launcher configurable by host and port without requiring users to edit the script.

## Impact

- Affects local Windows operator workflow only.
- No API, schema, or database changes are required.
