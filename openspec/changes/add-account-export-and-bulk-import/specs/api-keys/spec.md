## ADDED Requirements

### Requirement: Dashboard backup includes API key durable state

Dashboard backup payloads SHALL include API key durable metadata needed to restore API key behavior without exposing plaintext keys.

#### Scenario: Export API key durable state

- **WHEN** an admin exports a dashboard backup and API keys exist
- **THEN** each backup entry includes `id`, `name`, `keyHash`, `keyPrefix`, allowed model settings, enforced settings, activation state, expiration, assignment scope, assigned accounts, and limit rows with `max`, `current`, `reset`, and `modelFilter`
- **AND** the plaintext API key value is not included

### Requirement: Restored API key state applies without restart

The system MUST invalidate API key caches after dashboard restore so restored API key behavior applies to subsequent requests without server restart.

#### Scenario: Restore API key auth state

- **WHEN** an admin restores a backup that changes API key auth settings or API key rows
- **THEN** the next protected proxy request observes the restored API key settings and restored key metadata without restarting the server
