## ADDED Requirements

### Requirement: Accounts support date-based expiration

The dashboard SHALL allow each stored account to carry an optional date-only `expiresOn` value represented as `YYYY-MM-DD`.

#### Scenario: Set account expiration date

- **WHEN** an operator calls `PUT /api/accounts/{account_id}/expiry` with `expiresOn`
- **THEN** the system stores the provided date for that account
- **AND** subsequent account listings include the same `expiresOn` value

#### Scenario: Clear account expiration date

- **WHEN** an operator calls `PUT /api/accounts/{account_id}/expiry` with `expiresOn = null`
- **THEN** the system removes any previously stored expiration date

### Requirement: Account expiration is informational only

The system SHALL treat `expiresOn` as informational account metadata only and SHALL NOT exclude accounts from routing, active-session reuse, or `chatgpt-account-id` authorization because of that value.

#### Scenario: Routing ignores account expiration metadata

- **WHEN** an account has `expiresOn = 2026-05-01`
- **THEN** the system stores and returns that value for dashboard use
- **AND** account pool eligibility remains governed only by the account's actual status fields

### Requirement: Account expiration survives backup and restore

The dashboard backup payload SHALL include each account's optional `expiresOn` field and SHALL restore it without modification.

#### Scenario: Restore account expiration from backup

- **WHEN** a dashboard backup contains an account with `expiresOn`
- **THEN** restoring that backup recreates the account with the same `expiresOn` value
