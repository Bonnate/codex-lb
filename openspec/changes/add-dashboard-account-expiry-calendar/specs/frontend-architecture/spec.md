## ADDED Requirements

### Requirement: Dashboard account schedule calendar

The Dashboard page SHALL include a monthly account schedule calendar card below the usage donut section and above the account section.

#### Scenario: Show account expiration dates by month

- **WHEN** a dashboard account has an `expiresOn` value within the visible month
- **THEN** the calendar displays the account label on that date

#### Scenario: Show weekly usage reset dates by month

- **WHEN** a dashboard account has a `resetAtSecondary` value within the visible month
- **THEN** the calendar displays the account label on that local date as a weekly usage reset

#### Scenario: Configure calendar time basis

- **WHEN** a user changes the dashboard calendar time basis from the Settings page
- **THEN** weekly usage reset dates use the selected basis
- **AND** the default basis is KST

#### Scenario: Navigate calendar months

- **WHEN** a user clicks the previous or next month control
- **THEN** the calendar changes the visible month without refetching dashboard data

#### Scenario: Summarize crowded expiration dates

- **WHEN** more than two accounts expire on the same visible date
- **THEN** the calendar shows two account labels and summarizes the remaining count

#### Scenario: Respect dashboard privacy mode

- **WHEN** account privacy mode is set to blur or prefix
- **THEN** account labels in the expiration calendar use the same privacy behavior as other dashboard account labels

#### Scenario: No configured schedule dates

- **WHEN** no dashboard account has an `expiresOn` or `resetAtSecondary` value
- **THEN** the calendar card displays an empty state message
