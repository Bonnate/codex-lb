## ADDED Requirements

### Requirement: Dashboard backup export returns a versioned durable snapshot

The dashboard SHALL provide `GET /api/settings/backup` that returns a single JSON attachment containing the durable dashboard state required to move or restore an instance. The payload MUST include `version`, `exportedAt`, `accounts`, `dashboardSettings`, `dashboardAuth`, and `apiKeys`.

#### Scenario: Export dashboard backup

- **WHEN** an admin requests `GET /api/settings/backup`
- **THEN** the system returns `200` with `application/json`
- **AND** includes a `Content-Disposition` attachment filename ending in `codex-lb-backup.json`
- **AND** the payload contains a versioned root object with `accounts`, `dashboardSettings`, `dashboardAuth`, and `apiKeys`

#### Scenario: Export account durable state

- **WHEN** an admin exports a dashboard backup that contains stored accounts
- **THEN** each exported account includes durable identity fields, decrypted portable tokens, `lastRefreshAt`, `status`, `deactivationReason`, `resetAt`, and `blockedAt`

### Requirement: Dashboard restore overwrites settings and merges accounts and API keys

The dashboard SHALL provide `POST /api/settings/restore` that accepts exactly one uploaded backup file. The system MUST overwrite dashboard settings and dashboard auth state from the backup, and MUST merge accounts and API keys by skipping duplicates instead of updating them.

#### Scenario: Restore dashboard backup

- **WHEN** an admin submits `POST /api/settings/restore` with one valid backup file
- **THEN** the system restores dashboard settings and dashboard auth state from the file
- **AND** imports accounts that are not already stored
- **AND** imports API keys that do not conflict by `id` or `key_hash`
- **AND** returns a summary containing `settingsApplied`, `accountsImported`, `accountsSkipped`, `apiKeysImported`, and `apiKeysSkipped`

#### Scenario: Skip duplicate account during restore

- **WHEN** an admin restores a backup containing an account whose normalized identity is already stored locally
- **THEN** the system skips that account without modifying the existing stored row
- **AND** increments `accountsSkipped`

#### Scenario: Skip duplicate API key during restore

- **WHEN** an admin restores a backup containing an API key whose `id` or `key_hash` already exists locally
- **THEN** the system skips that API key without modifying the existing stored row
- **AND** increments `apiKeysSkipped`

#### Scenario: Reject invalid restore payload

- **WHEN** an admin submits `POST /api/settings/restore` without exactly one valid backup file
- **THEN** the system returns `400` with dashboard error code `invalid_backup_payload`

### Requirement: Legacy account import and export endpoints are removed

The dashboard SHALL NOT use or expose the legacy account import/export endpoints for operator backup workflows.

#### Scenario: Account backup workflow uses settings endpoints

- **WHEN** an operator needs to export or restore account state
- **THEN** the workflow uses `GET /api/settings/backup` and `POST /api/settings/restore`
- **AND** not `POST /api/accounts/import`, `POST /api/accounts/export`, or `GET /api/accounts/{account_id}/export`
