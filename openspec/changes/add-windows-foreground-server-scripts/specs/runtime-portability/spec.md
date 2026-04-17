## ADDED Requirements

### Requirement: Windows local server control scripts

The project SHALL provide Windows local server control scripts that let an operator run `codex-lb` in the foreground and stop that same local server instance later from another terminal.

#### Scenario: Foreground launcher starts local server

- **WHEN** an operator runs the Windows launcher script
- **THEN** the service starts in the current console instead of detaching to the background
- **AND** the launcher records the active process ID in a PID file while the server is running

#### Scenario: Stop script terminates recorded server

- **WHEN** an operator runs the Windows stop script while the launcher-managed server is active
- **THEN** the script terminates that recorded process
- **AND** removes the PID file afterward

#### Scenario: Stop script clears stale PID file

- **WHEN** the PID file exists but the recorded process is no longer running
- **THEN** the stop script removes the stale PID file
- **AND** exits without failing the operator workflow

#### Scenario: Foreground launcher cleans previous local port owner

- **WHEN** an operator reruns the Windows launcher for a port that is already occupied locally
- **THEN** the launcher terminates the recorded launcher PID if present
- **AND** frees any local TCP listener already bound to that port before starting the new server instance

### Requirement: Windows EXE launchers are buildable

The project SHALL provide a repeatable way to build Windows `.exe` launchers for starting and stopping the local `codex-lb` server workflow.

#### Scenario: Build launcher executables

- **WHEN** an operator runs the Windows launcher build script
- **THEN** the project produces start and stop `.exe` launchers
- **AND** those launchers delegate to the same server control workflow used by the `.cmd` scripts
