# UCR Student Portal — Admin Tools, Performance, Student Check-in & R2 Backup

## Antigravity implementation prompt

Upgrade the **existing UCR Student Portal project**. Do not rebuild the application or replace working features. First inspect the current code, routes, Supabase schema/RLS, authentication and roles, timetable, attendance workflow, cache/data-fetching approach, and Cloudflare R2 backup implementation.

Use the two supplied screenshots as UI references:
- Admin dashboard screenshot: the “Quick Administrative Console Tools” cards for Students Roster, Division Chat, PDF Generator, and Student Invites.
- Student mobile dashboard screenshot: the attendance standing card, live lecture status, pending tasks, division chat, and bottom navigation.

The application is mobile-first. Preserve the current UCR TV Studies visual identity, dark theme, navigation structure, and working functionality. Implement incrementally and keep the app runnable.

---

# 1. Admin Quick Administrative Console Tools — make every card work

On the Admin dashboard, the four Quick Administrative Console Tools currently appear clickable but are not functioning correctly.

Inspect each card and connect it to its real feature:

1. **Students Roster**
   - Navigate to the existing student roster/search/details page.
   - Preserve filters, student details, and authorized admin actions.
   - Do not create a duplicate roster page if one already exists.

2. **Division Chat**
   - Navigate to the existing division chat and moderation tools.
   - Admin controls should work according to existing permissions, including message moderation/clearing options already implemented.
   - Do not silently delete messages when opening the tool.

3. **PDF Generator**
   - Open the existing PDF/list generator.
   - Ensure the button opens the actual generator and its existing options work.
   - Do not create a placeholder page.

4. **Student Invites**
   - Open the existing invitation-code/access-token management page.
   - Ensure admin can view and manage invitation status and perform supported actions.

For all cards:
- Fix incorrect route names, missing click handlers, disabled states, overlays, and navigation errors.
- Ensure the destination page loads without a full browser reload.
- Show a useful error if navigation or the target feature fails.
- Add appropriate loading/pressed feedback.
- Verify each card as both a Super Admin and a Representative, respecting role permissions.
- Do not make a card appear functional if its action is not implemented.

Also inspect the “Manage Schedule” link in the Live Timetable section and confirm it navigates to the actual schedule management screen.

---

# 2. Stop the whole app from refreshing when switching tabs

Currently, changing tabs appears to refresh/reload the full website and dashboard. Fix this.

## Required navigation behavior
- Use the existing router/framework's client-side navigation correctly.
- Switching Overview, Attendance, Timetable, Tasks/Workspace, Chat, and other tabs must not reload the entire document.
- Preserve the application shell, navigation state, and appropriate page state.
- Avoid unnecessary remounting of the whole application.
- Keep browser back/forward navigation working.
- Directly opening or refreshing a deep link must still work.
- Use route-level lazy loading/code splitting where appropriate, without showing a blank screen.
- Display a small, consistent loading state only for the content that is actually loading.

Do not introduce a second routing system if the project already has one.

---

# 3. Speed up Dashboard and Attendance

The dashboard and especially Attendance currently take too long to load. Profile the real causes before changing the data layer.

Inspect:
- Network/database request count and duration.
- Duplicate Supabase queries.
- N+1 query patterns.
- Large unpaginated student/attendance queries.
- Repeated fetching when switching tabs.
- Expensive client-side calculations and rendering.
- Unnecessary Realtime subscriptions.
- Components that remount and refetch on every navigation.

## Cache strategy

Implement a suitable cache using the project's existing data-fetching library if present. Do not add a competing cache framework unnecessarily.

Use a sensible **stale-while-revalidate** approach:
- Display cached dashboard/attendance data immediately when available.
- Revalidate in the background when data may have changed.
- Keep a clear last-updated or refreshing indicator where useful.
- Update the relevant cache after successful create/edit/delete operations.
- Invalidate only affected queries instead of clearing the entire cache.
- Keep cached data scoped to the authenticated user, role, and permitted cohort.
- Clear or isolate user-specific cache on logout/account switch to prevent data leakage.
- Never use cached data as authorization; Supabase/backend RLS remains authoritative.
- Do not cache sensitive data in an unsafe persistent browser store.

Suggested behavior:
- Dashboard summary: cache briefly and revalidate in background.
- Timetable: cache until changed, with explicit invalidation after schedule edits.
- Attendance history: cache by student/stage/month or by admin filters.
- Attendance marking screen: always verify the selected session's current saved state before committing changes.
- Student roster: paginate and cache authorized result pages rather than downloading every student record.

Choose actual cache durations based on the existing framework and update patterns; do not hard-code excessive long-lived stale data.

## Database request optimization
- Query only the required columns and date ranges.
- Add/verify indexes for actual filter and join columns.
- Use pagination for large lists.
- Avoid fetching every student's full attendance history.
- Avoid duplicate requests triggered by both parent and child components.
- Debounce search inputs.
- Use server-side aggregation for expensive attendance summaries when beneficial.
- Avoid aggressive polling.
- Do not refetch all portal data on every tab change.

## Realtime updates without excessive requests

The user wants updates to appear promptly, but the app must remain efficient on limited/free-tier resources.

Use Supabase Realtime selectively:
- Subscribe only to the tables/events and authorized scope that a currently open screen needs.
- Prefer targeted subscriptions for the active user's records or selected cohort/session.
- Do not create duplicate subscriptions on each render or tab visit.
- Clean up subscriptions when the relevant screen is no longer active.
- Use Realtime events to update/invalidate the relevant cache, not to refetch the entire application.
- Avoid subscribing every student client to all attendance records.
- For data where Realtime is unnecessary, use cache plus refresh-on-focus or a manual refresh control.
- On reconnect, reconcile with the database so missed events do not leave stale data.
- Do not use frequent polling as a substitute for Realtime.

If the current app already has a good selective Realtime implementation, fix and reuse it rather than replacing it.

---

# 4. Student attendance — Admin “Push to Check in”

Add a student self-check-in workflow that works together with the existing Admin/Representative manual attendance list.

## Admin workflow

On the attendance session screen, for a valid scheduled lecture session, add a clear action:

**“Push to Check in”**

When an authorized Admin/Representative presses it:
- Confirm the selected session, module, date/time, and target cohort/batch.
- Publish a check-in request for that exact session and intended cohort.
- Show the check-in state: Not Published, Active, Expired/Closed.
- Allow the admin to close/stop check-in.
- Allow a configurable short check-in window or expiry.
- Only one active check-in request should exist per intended session unless the existing design explicitly supports multiple.
- Show a live count of submitted, pending, confirmed, and withdrawn check-ins.
- Do not publish a check-in for a cancelled/postponed session.
- Do not send the request to students outside the selected cohort/session scope.

The push action must not automatically mark everyone Present.

## Student dashboard workflow

When a check-in request is active for the student's cohort, display a prominent card on the Student Dashboard.

The card should show:
- Lecture/module name.
- Date and relevant time.
- A clear message such as “Attendance check-in is open”.
- A prominent **“Check in”** button.
- An **“Undo”** action after successful submission, subject to the rules below.
- Clear states: Available, Submitted, Withdrawn, Closed/Expired, and Already Recorded.

Example student-facing message:

“Your lecture check-in is open”
“Module: [Actual module name]”
“Tap below to notify your representative that you are present.”

Button: **Check in**

After the student taps:
- Submit a check-in record linked to the exact active session and authenticated student.
- Show success only after the database confirms the submission.
- Update the button/card to show “Check-in submitted”.
- Do not allow repeated clicks to create duplicate records.
- If the student already has a final attendance record for that session, show “Attendance already recorded” and do not overwrite it.
- If the request is expired/closed, reject the submission server-side and show an understandable message.

The student's action is a **check-in request/claim**, not an automatically trusted final attendance mark. It must appear in the Admin/Representative attendance workflow for review.

## Undo behavior

Allow a student to undo/withdraw their check-in only while the check-in window is active and before an authorized admin finalizes/locks the attendance record.

- Show a confirmation if appropriate.
- Record withdrawal rather than silently erasing the audit trail.
- Update the admin list promptly.
- Once finalized/locked or closed according to policy, prevent undo and explain why.
- Prevent repeated undo/submit races.

## Admin/Representative manual attendance list integration

When students check in, update the existing manual attendance list for that exact session.

For a student with a submitted check-in, show a clear marker, for example:
- **“Already checked in”**
- **“Student check-in — Pending confirmation”**

Do not silently convert a submitted check-in into final Present unless the existing attendance policy explicitly requires that and the user approves it.

Admin/Representative can:
- See who has checked in.
- See who has not checked in.
- Confirm a check-in as Present.
- Mark a student Absent when appropriate.
- Correct a check-in if needed.
- See withdrawn check-ins.
- Continue to manually mark students who did not use the check-in button.

Final Present/Absent attendance remains controlled by authorized Admin/Representative users. Student check-in is a convenient signal to the manual attendance workflow.

## Security and integrity

- Derive student identity from the authenticated session on the server/database side; never trust a student ID sent by the browser.
- Validate the active session, cohort membership, session status, and expiry server-side.
- One check-in per student per session; enforce with a unique database constraint.
- Use safe atomic operations to avoid duplicate/racing submissions.
- Students can submit/withdraw only their own check-in while eligible.
- Students cannot confirm final attendance or change another student's record.
- Representatives can manage only their authorized cohorts.
- Super Admin-only controls remain protected.
- Apply Supabase RLS and backend authorization.
- Do not expose service-role keys.
- Keep an audit trail with created/withdrawn/confirmed timestamps and actor IDs.
- Do not rely on client-side time alone to determine whether a check-in is open.

Do not add GPS tracking, camera verification, biometric checks, or other invasive verification unless separately requested. Do not claim the check-in proves physical presence; it is a student-submitted attendance signal for admin review.

---

# 5. Cloudflare R2 Online Backup — verify and fix the real workflow

The project has an online backup option intended to upload backups to Cloudflare R2. Inspect the existing implementation and verify that it actually works.

Do not merely check whether environment variables exist or whether the UI says “Success”.

## Inspect
- Backup UI and trigger action.
- Backend/server endpoint or scheduled job.
- R2 bucket configuration.
- Account ID, access key, secret key, bucket name, public domain (if used), and endpoint construction.
- Upload method and object key naming.
- Backup file creation and completeness.
- Error handling, logs, and success state.
- Restore/download workflow, if implemented.
- Whether the backup contains the intended database data and required metadata.

Never print or expose secret values in logs, UI, Git, or reports.

## Verify actual upload
In a safe development/test environment:
1. Trigger a backup using the existing backup UI or supported backend workflow.
2. Confirm the backup file is generated successfully.
3. Upload it to the intended R2 bucket using server-side credentials.
4. Confirm the R2 API reports the object exists.
5. Verify object key, file size, content type, upload timestamp, and checksum/ETag where applicable.
6. Download the test backup from R2 and verify it is readable and not truncated/corrupt.
7. If a restore process exists, test restoration only in an isolated test database.
8. Confirm the UI reports success only after upload verification succeeds.
9. Confirm failures show actionable errors and do not claim the backup succeeded.

## Backup safety
- R2 credentials must be used only server-side.
- Never expose secret access keys to the browser.
- Do not make a private backup bucket public just to make uploads work.
- Use private object storage and authenticated server-side access for restore/download.
- Use unique timestamped backup object keys; do not accidentally overwrite the last good backup.
- Keep a backup manifest with creation time, app/database identifier, backup format/version, file size, and checksum where practical.
- Do not include secrets in backup manifests.
- Do not delete old backups unless an explicit retention policy is configured and tested.
- Avoid claiming that uploading a database dump is a complete backup if storage objects, schema/migrations, or required metadata are omitted.
- Document exactly what is included and excluded.
- Never run a destructive restore against production during testing.

If the existing backup option is broken, fix it using the project's current architecture and environment variables where possible. Do not replace working R2 configuration or ask the user to paste secrets into chat.

Create a clear backup status display:
- Never Backed Up / In Progress / Success / Failed.
- Last successful backup timestamp.
- Backup file name/object key (safe to display).
- File size.
- Useful failure reason without revealing credentials.

---

# 6. Mobile-first UI and accessibility

Verify all changes on narrow mobile viewports as well as desktop.

- Admin tool cards must be touch-friendly and navigate correctly.
- Student check-in card must be prominent without overwhelming the dashboard.
- Check-in and Undo buttons must be large enough for touch.
- Show clear loading, success, expired, and error states.
- Prevent layout overflow and unwanted horizontal scrolling.
- Preserve the current bottom navigation and dashboard visual style.
- Make attendance lists usable on phones; use stacked cards or responsive rows where needed.
- Ensure status is communicated by text/icons as well as colour.
- Keep animations subtle and avoid expensive visual effects.

---

# 7. Testing and demo run

Use a separate development/test Supabase project or isolated test schema. Never use real student records for demo check-ins or backup tests. If no isolated environment exists, stop before inserting demo data or testing destructive restore operations and request approval.

### Admin tool tests
- Test Students Roster card.
- Test Division Chat card.
- Test PDF Generator card.
- Test Student Invites card.
- Test Manage Schedule link.
- Verify role-specific access.

### Navigation/performance tests
- Switch through every tab and confirm there is no full document reload.
- Confirm cached content appears quickly on revisit.
- Confirm relevant changes update the cache.
- Confirm a Realtime update appears on the correct screen.
- Confirm subscriptions are cleaned up and not duplicated.
- Measure Dashboard and Attendance load times before/after.
- Confirm logout/account switching does not reveal previous user's cached data.
- Check browser console and network logs for duplicate requests/errors.

### Student check-in tests
1. Admin creates/opens a valid timetable-based session.
2. Admin pushes check-in to the correct cohort.
3. A student in that cohort sees the correct module card.
4. A student outside that cohort does not see or submit to it.
5. Student submits check-in.
6. Admin list shows “Student check-in — Pending confirmation”.
7. Repeated submission does not create a duplicate.
8. Student can undo while eligible.
9. Admin sees the withdrawn state.
10. Admin confirms Present or manually marks Absent.
11. Student cannot change final attendance.
12. Closed/expired session rejects new check-ins server-side.
13. Cancelled/postponed sessions cannot accept check-ins.
14. Student cannot submit for another student's identity.
15. Reloading both clients preserves the correct state.

### R2 backup tests
1. Trigger test backup.
2. Confirm server-side generation.
3. Confirm R2 object exists.
4. Verify file size and checksum/ETag.
5. Download and inspect test backup.
6. Test restore only in isolated test database if supported.
7. Test invalid credentials/network failure and ensure UI reports failure.
8. Confirm no secrets appear in browser bundles, logs, or UI.

---

# 8. Required deliverables

Create/update:
- `README.md` — setup and feature documentation.
- `ADMIN_TOOLS_AUDIT.md` — tool card routes/actions and permissions.
- `PERFORMANCE_AUDIT.md` — before/after load times, request counts, cache strategy, and Realtime subscriptions.
- `STUDENT_CHECKIN_DESIGN.md` — schema, states, RLS, workflow, and undo/finalization rules.
- `R2_BACKUP_TEST_REPORT.md` — actual upload/download verification, object metadata, and test outcomes.
- `IMPLEMENTATION_TEST_REPORT.md` — pass/fail results for all test groups.

Also provide:
- Changed/created file list.
- Migration files and commands.
- Environment variable names only, never secret values.
- Local run instructions.
- Demo steps for Admin and Student check-in.
- Screenshots of the working mobile and desktop views.
- Any incomplete items and decisions requiring user approval.

---

# 9. Acceptance checklist

- [ ] All four Admin Quick Administrative Console Tools work.
- [ ] Manage Schedule link works.
- [ ] Switching tabs does not reload the whole app.
- [ ] Dashboard and Attendance are measurably faster.
- [ ] Cache serves useful existing data quickly and revalidates safely.
- [ ] Updates appear promptly without excessive requests.
- [ ] Realtime subscriptions are scoped, cleaned up, and not duplicated.
- [ ] User-specific cache is isolated and cleared appropriately on logout.
- [ ] Admin can push check-in for a specific active timetable session/cohort.
- [ ] Only intended students see the check-in card.
- [ ] Student can submit once and undo only while eligible.
- [ ] Admin/Representative sees check-in status in the manual attendance list.
- [ ] Student check-in does not silently finalize Present.
- [ ] Final attendance remains under authorized admin/rep control.
- [ ] R2 backup is verified by checking and downloading the actual uploaded object.
- [ ] Backup UI reports real success/failure.
- [ ] No secrets are exposed.
- [ ] Mobile and desktop layouts are verified.
- [ ] Isolated demo tests pass.
- [ ] Existing working features and production data remain intact.

## Final instruction

Start by auditing the current project and identifying the actual causes of broken admin cards, full-page refreshes, slow loading, check-in integration gaps, and R2 backup failures. Then implement each area incrementally. Reuse existing routes, components, schema, authentication, cache libraries, timetable, and backup code where sound. Do not duplicate systems or make broad rewrites without evidence. Do not claim success without testing real database persistence, role restrictions, cache/realtime behavior, and an actual R2 test upload/download.
