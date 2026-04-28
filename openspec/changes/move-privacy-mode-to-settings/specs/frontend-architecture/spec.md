## ADDED Requirements

### Requirement: Settings page manages account display privacy

The Settings page SHALL include an account display privacy control in the appearance/display section. The control MUST be browser-local and MUST NOT require a backend settings API or database schema change.

#### Scenario: User selects an account display mode

- **WHEN** the user opens the Settings page appearance section
- **THEN** the dashboard shows account display mode options for 기본, 흐림, and 앞 6글자
- **AND** the currently selected mode exposes selected state to assistive technologies

#### Scenario: Account display mode is applied across account labels

- **WHEN** the user selects 흐림
- **THEN** account/email labels that participate in privacy mode are visually blurred
- **WHEN** the user selects 앞 6글자
- **THEN** account/email labels that participate in privacy mode show only the first six characters followed by an ellipsis when the original label is longer than six characters
- **WHEN** the user selects 기본
- **THEN** those labels are shown without privacy transformation

#### Scenario: Legacy privacy preference remains compatible

- **WHEN** a browser has the legacy `codex-lb-privacy` value set to `1` and no new account display mode value
- **THEN** the dashboard initializes account display mode to 흐림
