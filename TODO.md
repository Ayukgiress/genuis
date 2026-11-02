# TODO

- [x] Fix AI Interview Coach dashboard prep logic:
  - [x] Use normalized job IDs from applications/job records; never infer IDs from Kanban card titles
  - [x] Reuse the dashboard's single active-interview query and create only missing sessions
  - [x] De-duplicate automatic and button-triggered creation, including in-flight requests
  - [x] Show one toast per newly created prep session
- [x] Run targeted ESLint and production build; both pass
- [ ] Resolve existing repository-wide ESLint errors outside the dashboard prep changes

