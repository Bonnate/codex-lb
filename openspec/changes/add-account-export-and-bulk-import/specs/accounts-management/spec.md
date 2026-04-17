## ADDED Requirements

### Requirement: Dashboard account import accepts auth files and export bundles

The dashboard account import API SHALL accept one or more uploaded `auth.json` files or exported account archive bundles in a single `POST /api/accounts/import` request. The system MUST validate each extracted auth payload, import each valid account, and return the imported accounts as a list in request order.

#### Scenario: Import multiple accounts in one request

- **WHEN** an admin submits `POST /api/accounts/import` with multiple `auth_json` files
- **THEN** the system imports each file
- **AND** returns `{ "accounts": [{ "accountId": "..." }, { "accountId": "..." }] }`

#### Scenario: Import a single account in one request

- **WHEN** an admin submits `POST /api/accounts/import` with one `auth_json` file
- **THEN** the system imports the account
- **AND** still returns the imported result inside the `accounts` list

#### Scenario: Import exported archive bundle

- **WHEN** an admin submits `POST /api/accounts/import` with an exported archive bundle containing multiple `auth.json` payloads
- **THEN** the system extracts each auth payload from the archive
- **AND** imports each valid account
- **AND** returns the imported accounts as a flat `accounts` list

#### Scenario: Duplicate account import is ignored

- **WHEN** an admin submits `POST /api/accounts/import` with an `auth_json` file for an account that is already stored locally
- **THEN** the system skips that file without modifying the existing account
- **AND** the response increments `skippedCount`

### Requirement: Dashboard bulk account export returns archive bundle

The dashboard SHALL allow exporting multiple stored accounts via `POST /api/accounts/export`. The system MUST return a downloadable archive bundle containing one `auth.json` payload per selected account so the archive can be imported into another `codex-lb` instance later.

#### Scenario: Export multiple existing accounts

- **WHEN** an admin requests `POST /api/accounts/export` with multiple existing `account_ids`
- **THEN** the system returns `200` with `application/zip`
- **AND** includes a `Content-Disposition` attachment filename ending in `.zip`
- **AND** the archive contains one `.auth.json` file per requested account

#### Scenario: Export request without account ids

- **WHEN** an admin requests `POST /api/accounts/export` with an empty `account_ids` list
- **THEN** the system returns `400` with dashboard error code `invalid_account_export_request`

### Requirement: Dashboard account export returns auth.json

The dashboard SHALL allow exporting a stored account via `GET /api/accounts/{account_id}/export`. The system MUST return a downloadable JSON payload containing the stored account tokens in `auth.json` format so the file can be imported into another `codex-lb` instance later.

#### Scenario: Export existing account

- **WHEN** an admin requests `GET /api/accounts/{account_id}/export` for an existing account
- **THEN** the system returns `200` with `application/json`
- **AND** includes a `Content-Disposition` attachment filename ending in `.auth.json`
- **AND** the payload contains `tokens.idToken`, `tokens.accessToken`, `tokens.refreshToken`, and `lastRefreshAt`

#### Scenario: Export missing account

- **WHEN** an admin requests `GET /api/accounts/{account_id}/export` for an unknown account
- **THEN** the system returns `404` with dashboard error code `account_not_found`
