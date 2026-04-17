## 1. Spec
- [x] 1.1 Add an `accounts-management` delta for multi-file import and account export.
- [x] 1.2 Add a `frontend-architecture` delta for multi-file import and account export actions on the Accounts page.

## 2. Implementation
- [x] 2.1 Update the dashboard accounts API, schemas, and service to import multiple files or exported archive bundles in one request.
- [x] 2.2 Add dashboard bulk account export that returns a downloadable archive bundle for selected accounts while keeping single-account export.
- [x] 2.3 Update the Accounts page import dialog, account list, and account actions to support archive import and bulk export.

## 3. Validation
- [x] 3.1 Add or update backend tests for archive import and bulk account export.
- [x] 3.2 Add or update frontend tests and mocks for the changed import/export flows.
- [x] 3.3 Run targeted test suites.
- [ ] 3.4 Validate specs locally with `openspec validate --specs`.
