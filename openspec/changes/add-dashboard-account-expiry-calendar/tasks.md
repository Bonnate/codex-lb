## 1. Spec
- [x] 1.1 Add dashboard account expiration calendar requirements to the `frontend-architecture` delta.
- [x] 1.2 Extend the dashboard calendar requirements to include weekly usage reset dates.

## 2. Implementation
- [x] 2.1 Add an `AccountExpiryCalendar` dashboard component that renders a monthly calendar from `accounts[].expiresOn`.
- [x] 2.2 Place the calendar card below dashboard usage donuts and above the existing account section.
- [x] 2.3 Render `accounts[].resetAtSecondary` as weekly usage reset events in the same calendar.
- [x] 2.4 Add the dashboard calendar time basis option to Settings > Display and share it with the dashboard calendar.

## 3. Validation
- [x] 3.1 Add component coverage for month navigation, grouped expirations, overflow summaries, empty state, and privacy modes.
- [x] 3.2 Run focused dashboard tests and frontend typecheck.
- [x] 3.3 Add component coverage for weekly usage reset events.
- [x] 3.4 Add settings coverage for the dashboard calendar time basis option.
- [ ] 3.5 Run `openspec validate --specs` when the local OpenSpec CLI is available.
  - OpenSpec CLI is not available in this environment (`openspec` command not found).
