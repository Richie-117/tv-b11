# UCR Student Portal — Attendance System Upgrade & Student Invitation Codes

## Antigravity Implementation Specification

Upgrade the attendance feature in the **existing new UCR Portal project**. Do not rebuild the whole app unnecessarily. First inspect the current codebase, Supabase schema, roles, timetable integration, and attendance implementation. Preserve working features and adapt this specification to the actual architecture.

The app is primarily mobile-first. Use the uploaded attendance screenshots as the main visual references for Admin Attendance Management, Timetable, and Student monthly calendar.

## 1. Inspect first

- Inspect project structure, routes, components, authentication, role permissions, Supabase tables, relationships, RLS, timetable data, attendance logic, PDF/Excel tooling, and Student Invitation Codes.
- Inspect uploaded reference images and the actual timetable data/source (database, existing timetable config, or project files).
- Create `ATTENDANCE_IMPLEMENTATION_AUDIT.md` documenting existing files, schema, timetable source, role scope, reusable functionality, gaps, and risks.
- Do not modify the old/backup portal or connect this project to its production database.
- Do not delete, truncate, or overwrite existing student or attendance data.
- No destructive migration or demo insert into production.

## 2. Two attendance modes

### Student Mode — read only
Students can view only their own attendance:
- Mobile-first monthly calendar visualizer based on the supplied reference.
- Previous/next month navigation.
- Statuses: Present, Absent, Excused (if supported), Cancelled/Excluded, No Session, and Outside Tracking Period.
- Tap a date to see its module/session details.
- Stage/semester filters when applicable.
- Monthly valid session count, present count, absence count, and percentage.
- Clear empty/loading states.

Students cannot mark, edit, delete, create sessions, export administrative data, or view another student's records. Enforce using Supabase RLS and server-side authorization, not only UI hiding. Do not fetch other students' records and filter in the browser.

### Admin / Representative Mode
Authorized admins/reps can create, mark, save, edit, filter, and report attendance. Respect existing role and batch scope. Representatives must not receive Super Admin privileges.

## 3. Academic stages and date rules

Supported stages:
- Foundation — currently running.
- Level 5 — upcoming.
- Level 6 — upcoming.

Academic programme began **25 October 2026**; new portal attendance tracking begins **16 November 2026**.

- Never count dates before 16 Nov 2026 as absences or create assumed records for them.
- Level 5/6 are not active until dates/modules/timetables are confirmed.
- Do not invent future module, semester, or timetable data.
- Timetable days and modules may change per stage/semester.
- Keep stage/semester attendance totals separate.
- Use `Asia/Colombo` for academic dates and prevent timezone off-by-one errors.

## 4. Timetable-driven lecture sessions (critical)

**The timetable is the authoritative source for available lecture modules and schedule.** Inspect the current timetable records/configuration and map the attendance session picker to it.

- Read actual available timetable entries, including programme/target cohort, stage/level, weekday, time slot, module/course identifier, module title, and lecture type, wherever those fields exist.
- When an admin selects a date and cohort/programme, show only timetable lecture slots actually applicable to that date and cohort/programme.
- Derive the weekday from the selected local date and match it to the timetable.
- Selecting a timetable slot should auto-populate the matching module, programme/cohort, lecture type, and start/end time.
- If timetable data supports multiple lecture modules on the same day, show each as a distinct selectable session.
- Permit manual module selection only as an explicit fallback when no suitable timetable entry exists; require the admin to label/confirm it as a manual session.
- Do not hard-code module names or weekdays in the UI if the timetable already stores them.
- Do not create attendance for break/lunch/empty timetable slots.
- Validate that the selected module is appropriate for the selected academic stage/semester and cohort.
- If timetable schedules are updated later, do not silently rewrite historical attendance sessions. Store a session snapshot of module/title, schedule date/time, cohort/programme, and timetable reference as appropriate.
- Clearly indicate if the timetable has no lecture for the selected date.
- Handle timetable exceptions/overrides (cancelled, postponed, rescheduled) without duplicate counting.

## 5. Session creation, marking, and editing

Admin selects stage, semester (if applicable), cohort/batch, date, and timetable slot/module. Session type and time auto-fill from timetable where possible.

For each session:
- Load the roster within authorized scope.
- Mark each student Present or Absent.
- Display Present, Absent, and Not Yet Marked counts.
- Never silently convert unmarked students into Absent.
- Optional bulk mark actions require deliberate confirmation and easy correction.
- Save session and attendance rows safely/atomically (transaction or server-side equivalent).
- Show saving/loading states and genuine success/error feedback.
- Prevent duplicate submissions and duplicate attendance rows.
- Reopen saved sessions and edit them.
- Detect concurrent/stale edits rather than silently overwriting.
- Record created/updated by and timestamps; audit sensitive changes where practical.

One date may have multiple lecture modules. Each module is its own attendance session, and attendance is counted per session—not simply per day.

## 6. Lecture override

Session statuses should support Held/Conducted, Cancelled, Postponed, Rescheduled, and Not Held/No Attendance Required.

- Cancelled or not-held sessions are excluded from denominator and absence calculations.
- Postponed original sessions are excluded; retain original history and link the new session/date.
- Rescheduled lectures must not be double-counted.
- Overrides apply to an individual module session, not every module that day.
- Keep reason, actor, and timestamp.
- Do not delete original timetable/session history.

## 7. Admin filters and reports

Support combined filters as applicable: stage, semester, cohort/batch, student, module, exact date, week, month/year, custom range, attendance status, and session status.

Provide daily, weekly, monthly, student-wise, module-wise, batch-wise (within authorized scope), and absentee-only views/reports. Display selected filters and period.

### PDF
- UCR branding, title, generation timestamp, applied filters, period, stage/module/cohort where relevant.
- Readable tables, page numbers, repeated table headers on multipage reports.
- Valid session, present, absent, and percentage summaries where meaningful.
- Exclude cancelled/postponed/non-held sessions and dates before tracking start.
- Use the same query and calculation logic as the dashboard.
- Avoid exposing unrelated private student details.
- Show “Preparing report…” during processing.

## 8. Excel exports — separate worksheets per lecture module (important)

**Do not put all lecture-module attendance into one mixed, confusing worksheet.** Excel must organize attendance separately for each module, based on the actual timetable/module catalogue and saved sessions.

### Timetable-based worksheet assignment
1. Read the authoritative timetable and module records before designing export worksheets.
2. Identify the actual module identifier and title for each session. Prefer stable module IDs/codes; use normalized module titles only when an ID is unavailable.
3. Assign every attendance session to its matching module worksheet. Never classify modules based only on a loose substring match if stable IDs/codes exist.
4. Create a dedicated worksheet for each module included in the export. Worksheet names should be Excel-safe (maximum 31 characters, no invalid characters) and unique; include a short module code where needed.
5. Keep sessions for the same module together on its sheet, sorted chronologically. Columns should be consistent across module sheets.
6. Each module sheet should include date, session time, stage/level, semester, cohort/batch, module code/title, session status, student index, student name (only for authorized exports), attendance status, and relevant saved update timestamp.
7. Where a module has multiple sessions on the same date, list each session separately using its session ID/time; do not merge records or overwrite rows.
8. Add a `Summary` worksheet with selected filters, export timestamp, modules included, valid session counts, present/absent totals, and attendance percentage. Optionally add `Student Summary` and `Session Index` sheets if they clarify the workbook.
9. Include only modules/sessions that match the requested filters. For “All Attendance,” include every module in the user's authorized scope, with separate sheets per module.
10. Ensure cancelled/postponed sessions are clearly labelled on their module sheet but excluded from valid attendance totals.
11. The workbook must be generated from the latest saved Supabase records on each export—not a stale local/static spreadsheet.
12. Keep worksheet formatting clean: freeze header row, enable filters, readable widths, date/time formats, and distinguish status values. Avoid excessive decorative styling.
13. If the timetable contains a module that has no attendance records in the selected range, include its sheet only if the user chose an explicit “include empty scheduled modules” option; otherwise omit empty sheets and list them in Summary if useful.
14. Do not put addresses, parent phone numbers, or unrelated sensitive student details into exports.
15. Support pagination/batched or server-side generation for large exports. Display “Preparing Excel…” and prevent duplicate export requests.

Provide export filters:
- All attendance in permitted scope.
- Month or custom date range.
- Stage/level and semester.
- Cohort/batch.
- Student.
- Module (one or multiple).
- Absentees only.

The workbook's module sheets and totals must match the Admin dashboard and PDF report calculation.

## 9. Shared attendance calculation

Use one shared calculation method for Student calendar, Admin dashboard, PDF, and Excel.

`Attendance percentage = Present valid sessions / (Present valid sessions + Absent valid sessions) × 100`

- Valid sessions are held/conducted sessions on/after 16 Nov 2026 in the selected scope.
- Cancelled, postponed-original, and not-held sessions are excluded.
- Unmarked sessions are not Absent.
- Multiple modules in one day count separately.
- Dates with no scheduled session do not count.
- If denominator is zero, display “No attendance data” / “Not available,” not a misleading 0%.
- Document and test the shared calculation.

## 10. Foundation archive and future stages

When Foundation finishes, Super Admin can close/archive it:
- Preserve all Foundation records.
- Hide archived data from default active views while retaining historical reports and exports.
- Activate Level 5/6 only after schedule/module details are confirmed.
- Keep stage and semester totals independent.
- Do not provide a destructive one-click “clear attendance” feature.
- Permanent deletion, if required, must be a separate Super Admin action with backup, warning, and confirmation.

## 11. Student Invitation Codes & Access Tokens

Inspect and refine the existing per-student invitation code feature:
- Super Admin can generate individual or bulk codes for selected students.
- Each code is tied to the correct student index/account.
- Admin can copy, regenerate, revoke unused codes, expire codes, and filter Used/Unused/Expired/Revoked.
- Registration: student enters index number and one-time invitation code, system validates association, student activates/creates credentials according to existing authentication design, code becomes used, then student enters their own dashboard.
- Codes must be unpredictable, unique, single-use, rate-limited, and securely stored (hash tokens when feasible).
- Prevent cross-student code use and student-side code generation.
- Do not expose raw tokens unnecessarily.
- Enforce verification server-side.
- Preserve the current auth system unless a genuine security defect requires changes.

## 12. Mobile-first UI

Optimize for Android/iPhone, small screens, tablets, and desktop:
- No unnecessary horizontal scrolling.
- Touch-friendly controls.
- Responsive calendar and roster.
- Collapsible filters or bottom sheets on mobile.
- Stacked session forms.
- Readable tables/cards.
- Smooth but restrained transitions.
- Consistent UCR TV Studies branding and dark theme.
- Do not simply shrink desktop layouts to fit phones.

## 13. Supabase integrity and security

- Review existing schema/RLS before migrations.
- Use reviewed migration files.
- Preserve student IDs and existing relationships.
- Foreign keys and appropriate indexes.
- Unique constraint for student/session attendance rows.
- Validate module-stage-semester-cohort relationships.
- Student read scope: own attendance only.
- Representative write scope: assigned cohort/batch only.
- Super Admin-only operations remain protected.
- Never expose service-role secrets in frontend code.
- Never run destructive migrations automatically.

## 14. Performance and request optimization

Optimize for limited/free-tier usage:
- Query only selected date ranges, modules, and authorized cohorts.
- Avoid aggressive polling and unnecessary Realtime subscriptions.
- Avoid N+1 queries and repeated identical requests.
- Use pagination/server-side aggregation for large data.
- Debounce search and prevent duplicate clicks/requests.
- Refresh affected data after edits rather than refetching the entire app.
- Keep student mode lightweight.
- Show “Calculating attendance…”, “Preparing PDF…”, or “Preparing Excel…” during long operations.
- Keep UI responsive and provide actionable errors.

## 15. Isolated database demo

Run a full demo against a separate development/test Supabase project or isolated test schema using fake, clearly labelled students. Never seed demo data into production. If no isolated DB is available, stop and request approval before inserting demo records.

Test:
1. Admin creates a Foundation session from an actual timetable slot.
2. Only matching date/cohort lecture slots appear.
3. Multiple modules on a date create distinct sessions.
4. Admin marks Present/Absent and saves.
5. Reload confirms database persistence.
6. Edit attendance; reload confirms persistence.
7. Cancel a session; verify it is excluded from calculations.
8. Test postponed/rescheduled handling and no double count.
9. Verify student calendar and monthly totals.
10. Verify date/week/month/custom filters.
11. Generate PDF and compare totals with dashboard.
12. Export Excel and confirm separate worksheets per module, timetable-based assignment, latest records, filters, and correct totals.
13. Student sees only own records; attempts to access others are denied by RLS.
14. Student write attempts are denied.
15. Representative cannot perform Super Admin operations.
16. Invitation code works once and is bound to the intended index/account.
17. Pre-16 Nov 2026 dates are not counted as absences.

Add automated tests for calculation logic, date boundaries, timetable-to-module mapping, worksheet naming/uniqueness, duplicate prevention, RLS/permissions, and session overrides where practical.

## 16. Required deliverables

Create/update:
- `README.md` — setup and feature documentation.
- `ATTENDANCE_IMPLEMENTATION_AUDIT.md` — existing project audit.
- `ATTENDANCE_DATABASE_DESIGN.md` — schema, relationships, indexes, constraints, RLS, migrations.
- `ATTENDANCE_TEST_REPORT.md` — tests with expected/actual result and pass/fail.

Also provide:
- List of changed/created files.
- Environment variable names only (never values).
- Migration and local run commands.
- Admin/student demo walkthrough.
- Excel workbook structure example with module-specific worksheets.
- Screenshots where available.
- Incomplete items and decisions requiring user input.

## 17. Acceptance criteria

- [ ] Existing portal features and old backup remain untouched.
- [ ] Student mode is view-only and restricted to own attendance.
- [ ] Admin/representative mode supports session creation, marking, saving, and editing.
- [ ] Timetable is the source of available lecture modules and schedule.
- [ ] Each module session is separate, including multiple modules per date.
- [ ] Cancelled/postponed sessions do not create absences or double count.
- [ ] Attendance tracking begins on 16 Nov 2026; earlier dates are excluded.
- [ ] PDF filters and totals match dashboard.
- [ ] Excel is fresh on every export and has separate worksheets per module based on timetable/module IDs.
- [ ] Excel module worksheets are not mixed together; Summary sheet clearly explains included filters/totals.
- [ ] Foundation can be archived without deleting records.
- [ ] Invitation codes are individual, secure, and one-time-use.
- [ ] Mobile layout is carefully verified.
- [ ] Isolated database demo and permission tests pass.
- [ ] Documentation is updated and truthful.

## Final instruction

Start with an audit of the existing code, database, and timetable source. Implement incrementally while preserving working functionality. Do not guess module data or schedules. Do not claim success without actual database, PDF, Excel, and permission testing. Excel module separation and timetable-driven session assignment are mandatory acceptance requirements.
