## 1. Spec

- [x] 1.1 Add frontend architecture requirements for browser-local account display modes in Settings.

## 2. Frontend

- [x] 2.1 Replace the privacy boolean store with a `visible | blur | prefix` mode store and legacy read compatibility.
- [x] 2.2 Add shared account/email privacy display helpers for blur and six-character prefix rendering.
- [x] 2.3 Remove the header privacy toggle from desktop and mobile navigation.
- [x] 2.4 Add the three-mode control to Settings > Appearance.
- [x] 2.5 Apply the privacy mode to existing account/email display surfaces.

## 3. Tests

- [x] 3.1 Update appearance settings tests for the display mode control.
- [x] 3.2 Update privacy rendering tests for blur and prefix modes.
- [x] 3.3 Run targeted frontend tests.
- [x] 3.4 Run frontend typecheck.
- [ ] 3.5 Run OpenSpec validation.
  Local `openspec` and `python -m openspec` entry points are not available in this environment.
