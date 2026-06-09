# TODO

- [ ] Fix AI Interview Coach dashboard alert logic:
  - [ ] Correctly map Kanban cards to job IDs (avoid parseInt(card.title))
  - [ ] De-duplicate interview creation (fetch interviews once; create only missing active sessions)
  - [ ] Ensure toast alert fires only once per missing job prep
- [ ] Run lint/build and verify dashboard behavior

