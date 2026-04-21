## ADDED Requirements

### Requirement: Dashboard backup includes durable admin auth state

Dashboard backup payloads SHALL include the durable dashboard authentication state needed to restore password and TOTP login behavior.

#### Scenario: Export dashboard auth state

- **WHEN** an admin exports a dashboard backup
- **THEN** the payload includes `passwordHash`, `totpRequiredOnLogin`, and portable `totpSecret`
- **AND** excludes bootstrap token state, live session state, and transient TOTP verification state

### Requirement: Restored admin auth state applies without restart

The system MUST apply restored dashboard authentication state immediately after restore.

#### Scenario: Restore password and TOTP settings

- **WHEN** an admin restores a backup that changes password hash or TOTP settings
- **THEN** the next login attempt observes the restored `passwordHash`, `totpRequiredOnLogin`, and TOTP secret without restarting the server
- **AND** the restored TOTP secret is re-encrypted with the current instance key before persistence
