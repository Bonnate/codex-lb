## Why

The dashboard currently exposes email privacy as a quick eye-icon toggle in the top-right header. That makes the control visually prominent even though it is an operator preference, and it only supports a binary visible/blurred state.

Operators need this behavior grouped with other display preferences, and they need a middle-ground mode that keeps enough of each account label visible to distinguish entries without exposing the full account string.

## What Changes

- Move the account display privacy control from the app header into Settings > Appearance.
- Replace the boolean visible/blurred toggle with three browser-local modes: visible, blurred, and prefix-only.
- Preserve localStorage compatibility so existing blurred users remain blurred after the change.
- Apply the selected mode consistently to existing account/email privacy surfaces.

## Impact

- Specs: `openspec/specs/frontend-architecture/spec.md`
- Frontend: privacy preference store, header actions, Settings appearance controls, account/email rendering helpers, related tests
- Backend: no API, database, or settings schema changes
