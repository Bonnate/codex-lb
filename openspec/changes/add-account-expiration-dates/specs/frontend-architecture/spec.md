## ADDED Requirements

### Requirement: Accounts page exposes account expiration editing

The Accounts page SHALL expose a date-only expiration editor for the currently selected account.

#### Scenario: Save account expiration from the detail panel

- **WHEN** a user selects an account and saves a date in the expiration control
- **THEN** the app calls `PUT /api/accounts/{account_id}/expiry`
- **AND** refreshes account-dependent queries after success

#### Scenario: Clear account expiration from the detail panel

- **WHEN** a user clears the expiration control for the selected account
- **THEN** the app sends `expiresOn = null`
- **AND** reflects that the account no longer has a configured expiration date

#### Scenario: Show expiration date in the accounts list

- **WHEN** an account has a configured `expiresOn`
- **THEN** the accounts list displays that date alongside the account summary

#### Scenario: Sort accounts by expiration date

- **WHEN** a user changes the accounts list sort control to an expiration-date option
- **THEN** the list reorders accounts by `expiresOn`
- **AND** accounts without `expiresOn` appear after accounts with a configured date
