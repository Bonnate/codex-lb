## Why

Operators need a dashboard-level view of configured account expiration dates so upcoming expirations are visible without opening each account detail panel.

## What Changes

- Add a monthly account expiration calendar card to the Dashboard page.
- Use the existing `accounts[].expiresOn` date-only field from the dashboard overview response.
- Keep expiration dates informational only; they do not affect routing, account pool membership, or account status.

## Impact

- Frontend-only dashboard UI addition.
- No backend API, database, or settings schema changes.
