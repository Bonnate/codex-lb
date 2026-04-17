## Why

The Accounts page currently supports importing multiple `auth.json` files, but it still cannot export several stored accounts as one reusable backup bundle or import that bundle back in a single action. That makes multi-account migration and backup/restore workflows unnecessarily manual.

## What Changes

- Add dashboard bulk account export so an operator can download selected stored accounts as one archive bundle.
- Keep single-account export so the detail panel can still download one `auth.json` file directly.
- Extend account import to accept multiple uploaded `auth.json` files or exported account archive bundles in one request.
- Ignore duplicate account imports when the same account is already stored locally.
- Update the Accounts page UI so operators can select multiple files or archive bundles for import, select multiple accounts for bulk export, and still export the selected account from the detail panel.
- Translate the Accounts page workflow strings into Korean while keeping model identifiers unchanged.
- Cover the new API and frontend behavior with targeted tests.

## Impact

- Affects the dashboard account management API and Accounts page UI.
- Reuses the existing stored encrypted account tokens; no database schema changes are required.
- Preserves the list-based `POST /api/accounts/import` response contract while expanding accepted upload formats.
