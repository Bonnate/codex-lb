## 1. Spec
- [x] 1.1 Add account-add expiration behavior to the `frontend-architecture` delta.

## 2. Implementation
- [x] 2.1 Add a default one-month expiration date helper.
- [x] 2.2 Add an expiration date input to the OAuth add dialog intro stage.
- [x] 2.3 Apply the selected expiration date to newly added accounts after OAuth completion.
- [x] 2.4 Keep reauthentication dialogs free of the add-expiration input.

## 3. Validation
- [x] 3.1 Add coverage for default date calculation and OAuth dialog expiration input.
- [x] 3.2 Run focused account tests and frontend typecheck.
- [ ] 3.3 Run `openspec validate --specs` when the local OpenSpec CLI is available.
  - OpenSpec CLI is not available in this environment (`openspec` command not found).
