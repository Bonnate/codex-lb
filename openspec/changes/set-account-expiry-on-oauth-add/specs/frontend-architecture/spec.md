## ADDED Requirements

### Requirement: Account add dialog expiration date

The Accounts page SHALL let users choose an account expiration date while starting an OAuth account-add flow.

#### Scenario: Default expiration date

- **WHEN** a user opens the account-add OAuth dialog
- **THEN** the expiration date field defaults to one calendar month after the current local date

#### Scenario: Apply expiration after OAuth account add

- **WHEN** OAuth account add completes and creates one or more new accounts
- **THEN** the app applies the selected expiration date to those newly created accounts

#### Scenario: Reauthentication does not change expiration

- **WHEN** a user opens OAuth from an existing account reauthentication action
- **THEN** the dialog does not show the add-expiration field
- **AND** OAuth completion does not overwrite the account expiration date
