## ADDED Requirements

### Requirement: Settings page provides backup and restore actions

The Settings page SHALL provide a dedicated Backup & Restore section for dashboard backup workflows.

#### Scenario: Download dashboard backup

- **WHEN** a user clicks the backup download action in Settings
- **THEN** the app calls `GET /api/settings/backup`
- **AND** downloads the returned JSON attachment

#### Scenario: Restore dashboard backup

- **WHEN** a user uploads one backup JSON file in Settings and confirms restore
- **THEN** the app calls `POST /api/settings/restore`
- **AND** refreshes settings, accounts, dashboard overview, and API key queries on success
- **AND** shows the restore summary counts in the UI

#### Scenario: Explain restore semantics

- **WHEN** the Backup & Restore section is rendered
- **THEN** the UI explains that settings are overwritten while accounts and API keys are merged with duplicate skip behavior
- **AND** the UI states that server restart is not required after restore

### Requirement: Accounts page excludes import and export controls

The Accounts page SHALL no longer expose account backup import/export controls.

#### Scenario: Render Accounts page actions

- **WHEN** the Accounts page is rendered
- **THEN** the page shows account list browsing and operational actions such as add, pause, resume, detail view, and delete
- **AND** it does not show import, single export, bulk export, or export selection controls
