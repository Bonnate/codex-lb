## Why

Operators want new OAuth-added accounts to receive an expiration date immediately instead of adding the account first and editing the expiration afterward.

## What Changes

- Add an expiration date field to the account-add OAuth dialog.
- Default the field to one calendar month after the current local date.
- After OAuth add completes, apply the selected expiration date to newly created accounts using the existing account expiry API.
- Keep reauthentication flows unchanged and do not show the add-expiration field there.

## Impact

- Frontend-only orchestration over the existing `PUT /api/accounts/{account_id}/expiry` API.
- No backend API, database, or settings schema changes.
