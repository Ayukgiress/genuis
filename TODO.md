# Interview Page Updates - TODO

- [x] Add `isSpeaking` state declaration
- [x] Replace `speakText` with `speakTextAndWait` (Promise-based) + keep old `speakText`
- [x] Replace `handleChatMessage` with new response handler
- [x] Replace `startStructuredInterview` to kick off with AI greeting
- [x] Fix speech recognition `onresult` — auto-send after 1.8s silence
- [x] Update bottom UI — show Start Interview button and hide manual controls during interview

# Custom Letter Generation on Job Apply - TODO

- [x] Create `src/components/jobs/ApplyJobModal.tsx`
  - [x] Ask user if they want a custom cover letter
  - [x] If yes, prompt resume selection (auto-select if only 1, show dropdown if >1, error if 0)
  - [x] Generate letter via `letterApi.generate()`
  - [x] Open `job.source_url` in new tab after generation/choice
- [x] Modify `src/app/jobs/page.tsx`
  - [x] Replace Apply `<a>` link with button that opens modal
  - [x] Pass selected job and resumes into modal

