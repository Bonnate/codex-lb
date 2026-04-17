## ADDED Requirements

### Requirement: Accounts page import and export actions

The Accounts page SHALL let operators import multiple `auth.json` files or exported archive bundles in one action, export multiple selected accounts from the list, and export the currently selected account from the detail panel.

#### Scenario: Import multiple auth files

- **WHEN** a user clicks the import button and selects multiple `auth.json` files
- **THEN** the app calls `POST /api/accounts/import` with all selected files
- **AND** refreshes the account list on success

#### Scenario: Import exported archive bundle

- **WHEN** a user clicks the import button and selects an exported `.zip` account bundle
- **THEN** the app calls `POST /api/accounts/import` with the selected archive
- **AND** refreshes the account list on success

#### Scenario: Export selected accounts

- **WHEN** a user selects multiple accounts in the list and clicks the bulk export action
- **THEN** the app calls `POST /api/accounts/export`
- **AND** downloads the returned archive bundle for those accounts

#### Scenario: Export selected account

- **WHEN** a user clicks the export action for the selected account
- **THEN** the app calls `GET /api/accounts/{account_id}/export`
- **AND** downloads the returned `auth.json` attachment for that account
