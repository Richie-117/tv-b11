# UCR New Mobile-First Admin & Student Portal
## Antigravity Project Brief and Implementation Instructions

**Project goal:** Create a completely new, mobile-first UCR portal in a new folder on the `D:` drive. Use the existing portal only as a read-only reference and source of approved data/assets. The new application will focus first on a powerful Admin Mode. Student Mode will be implemented as a later phase after the admin system is stable.

**Suggested new project folder:** `D:\UCR-Portal-New`

**Existing project:** The current/previous UCR portal. Ask the user to select or confirm its local folder if it is not already open or clearly identifiable. Do not assume its path.

---

# 1. Critical Instructions: Inspect the Old Project, Preserve It, Build Separately

Before writing code:

1. Inspect the complete existing project and understand its framework, frontend, backend, database access, routes, authentication, admin features, PDF tools, timetable logic, backup feature and deployment configuration.
2. Identify all information and functionality that should be reused in the new project.
3. Make a written inventory of:
   - Existing student records and the full details available for the 48 students.
   - Student images, logos, branding and other reusable assets.
   - Existing PDF/list generator logic, templates, fonts and print layouts.
   - Existing timetable data and automatic live-lecture status logic.
   - Existing lecture cancellation/postponement controls.
   - Existing student login/invitation logic, if present.
   - Existing backup and restore functionality, including exactly what it backs up.
   - Existing admin roles and any Batch 4 representative information.
   - Existing modules, events, academic schedules and other useful records.
4. Distinguish verified data from assumptions. Do not invent missing student details.
5. Create a migration/source inventory report in the new project folder before importing anything.
6. Create the new folder `D:\UCR-Portal-New` and build the new project there. Do not build inside, rename, overwrite or delete the old project.
7. Treat the old project as read-only. Never change its production database or files during this discovery and migration task.
8. Do not copy old secrets, `.env` files, API keys, service-role keys, access tokens, database passwords, private certificates or credentials.
9. Do not copy unnecessary generated files, `node_modules`, build output, caches, logs, temporary files or old backups into the new source repository.
10. Preserve an independent, verified backup of the old project and its data before any data migration.

If the old project is not accessible, stop and ask the user to open/select its folder. Do not pretend that you inspected it.

## First deliverable: Discovery report

Create `OLD_PROJECT_DISCOVERY.md` in `D:\UCR-Portal-New` containing:
- Existing project structure and technology stack.
- Features and business rules discovered.
- Student data fields found and record count verified.
- Existing PDF generator behaviour and templates.
- Timetable/live lecture behaviour.
- Existing backup/restore behaviour.
- Existing authentication and roles.
- Reusable assets and source file paths.
- Data that is missing or needs user confirmation.
- Risks, compatibility issues and recommended migration plan.

Do not begin destructive changes or production data migration. Ask the user to review the discovery report before importing data or applying database migrations.

---

# 2. New Project Architecture and Database

This is a new application with a **new Supabase project and a new database**. Do not connect the new app to the old production database.

- Create a clean, maintainable architecture suitable for a mobile-first web app.
- Inspect the old stack, but choose the new stack based on maintainability, security, mobile performance and future APK packaging.
- Use Supabase for PostgreSQL data and authentication where appropriate.
- Keep all privileged Supabase keys on the server only.
- Use version-controlled SQL migrations.
- Create clear development, staging and production environment configuration.
- Include `.env.example` with variable names and placeholder values only.
- Add `.env`, secrets, local database dumps and private backup files to `.gitignore`.
- Never commit real student personal data or credentials to a public repository.
- Plan import of the 48 existing student records only after the user reviews the discovery report and confirms the data mapping.
- Verify imported record counts and key fields. Produce an import validation report.
- Do not assume the number is still exactly 48 until the old source is inspected.

Suggested entities (adapt to verified requirements; avoid unnecessary duplication):
- students
- student_private_details
- student_labels
- user_accounts / role assignments
- admin_audit_logs
- modules
- timetables
- lecture_status_updates
- attendance_sessions
- attendance_records
- assignment_schedules
- chat_messages
- polls
- poll_options
- poll_votes
- backup_jobs / backup_metadata

Use appropriate foreign keys, indexes, constraints and Row Level Security (RLS). All permissions must also be enforced by trusted server-side logic. Do not rely on hiding buttons in the frontend as security.

---

# 3. User Roles and Access Control

The initial release must focus on **Admin Mode**.

## Super Admin
The Super Admin has full system control:
- Create, invite, suspend and manage admin accounts.
- Assign or change roles.
- Manage Batch 4 representatives.
- View and edit all student records.
- Manage labels and student categories.
- Manage attendance, modules, timetables and assignments.
- Manage chat, polls and moderation.
- Access backup, restore and system settings.
- View audit logs.
- Configure system-wide settings.

There should be a safe way to identify and recover the Super Admin account. Never hardcode a public password or expose a secret super-admin key in frontend code.

## Batch 4 Representatives – Admin accounts
There are four Batch 4 representatives. They must sign in through the admin login and enter Admin Mode automatically.

They can:
- View and search student records.
- Edit student details.
- Manage student labels, subject to the granted permissions.
- Mark and correct attendance.
- Manage modules and lecture status if permitted.
- Manage assignments if permitted.
- Moderate and delete chat messages/posts if permitted.
- Use the PDF/list generator.
- View attendance dashboards and reports.

They must not:
- Manage Super Admin accounts or change their own role.
- Access backup/restore controls unless explicitly granted by Super Admin.
- Change security-critical settings or secrets.
- Permanently delete the whole database.
- Perform actions outside their assigned permissions.

Use explicit permissions and audit sensitive actions. The Super Admin must be able to change representative permissions.

## Students – Later phase
Student Mode is planned for a later phase, after the Admin Mode is stable. Do not let student features delay the first admin release. Prepare the architecture for student access without exposing student pages or enabling incomplete student functionality prematurely.

Planned student login:
- One-time invitation/activation issued by an authorized admin.
- Student index number plus password for subsequent login.
- Secure account-to-student-record linking.
- One-time, expiring, hashed invitation tokens.
- No account activation using an index number alone.
- Secure password recovery process.
- Students can access only their own permitted records.

---

# 4. Mobile-First UI and Design System

The primary use case is a mobile phone. Desktop must also work well, but do not design desktop first and squeeze it onto mobile.

Design direction:
- Premium, clean, modern university administration app.
- Dark navy/blue, orange accents and white/neutral surfaces, consistent with UCR branding.
- Clear hierarchy, readable typography and large touch targets.
- Fast navigation and minimal clutter.
- Consistent icons, buttons, forms, dialogs, tables and cards.
- Responsive layouts for small phones, large phones, tablets and desktop.
- On mobile, use a compact top bar and bottom navigation or a well-designed drawer where appropriate.
- Long student lists and reports must remain usable on phones.
- Use accessible contrast, keyboard support and clear validation messages.
- Provide loading skeletons, empty states, error states and success feedback.
- Avoid excessive animation and heavy effects.

Create reusable components and centralized design tokens. A future header, logo, theme colour, navigation label or layout change should be manageable in one shared place rather than requiring edits across many pages.

Do not hardcode the same header/navbar separately in every page. Build shared layouts and reusable components.

---

# 5. Admin Navigation and Main Features

Initial Admin Mode should include these main areas:

1. Dashboard
2. Students
3. Tools
4. Attendance
5. Calendar / Timetable
6. Assignments / Workspace
7. Chat
8. Admin Management (Super Admin or permitted roles)
9. Backups (Super Admin only)

Navigation may be adjusted after inspecting the old portal, but keep it easy to understand on mobile.

## 5.1 Admin Dashboard
Show useful at-a-glance information:
- Total students and counts by course/batch.
- Today's attendance summary.
- Attendance trends.
- Upcoming lectures.
- Current lecture status.
- Upcoming assignment deadlines.
- Recent administrative activity.
- Quick actions.

Do not make the dashboard issue many repeated requests. Use efficient aggregated queries and sensible caching.

## 5.2 Students Tab – Admin Only
Only authorized admin accounts can see the student list and student names. Student directory/details must not be publicly exposed.

Provide:
- Search by name, index number, course, batch and other permitted fields.
- Filters for course, batch, labels and other useful fields.
- Sorting and pagination.
- A clean student list with quick actions.
- Click a student to open a detailed profile.

Student record fields should be flexible and extensible. Existing known fields may include:
- Student full name.
- Index number.
- Course/programme (TPOPT or TPRPT).
- Batch.
- Gender, if already collected and genuinely required.
- Email address.
- Student telephone number.
- Residential address.
- Parent/guardian name.
- Parent/guardian telephone number.
- Emergency contact details.
- Other approved academic or administrative details.

Do not invent or automatically fill private details that are absent from the old database. Allow authorized admins to add or edit fields.

Student detail screen:
- Clearly grouped information.
- Copy button beside suitable fields (index number, name, email, phone, address, etc.).
- Edit action.
- Label management.
- Attendance summary.
- Relevant admin notes, if enabled.
- Clear indication of missing information.

Labels:
- Admins can create, rename, colour-code and assign labels (examples: “Class Representative”, “Needs Follow-up”, “Document Pending”).
- Labels must be configurable, not hardcoded.
- Allow filtering students by one or more labels.
- Audit label creation and assignment changes.

Privacy:
- Treat addresses, phone numbers, parent contacts and emergency contacts as private personal information.
- Restrict them to authorized admins.
- Do not show them in public pages, student-to-student views or public APIs.
- Avoid logging private values.
- Apply least-privilege access and audit access to sensitive records where practical.

## 5.3 Tools Tab

### Tool A: List Generator / PDF Generator
Reuse and improve the old PDF generator after inspecting its actual templates and logic.

Requirements:
- Easy, clean mobile-first interface.
- Choose list/report type.
- Select course/batch and filters.
- Choose fields/columns to include.
- Reorder columns if practical.
- Preview before generating.
- Clear print-friendly PDF output.
- Good page breaks, margins, page numbers and headers/footers.
- UCR branding where appropriate.
- Support different reusable templates/formats.
- Avoid clipped columns and unreadable small text.
- Generate only the selected/authorized student details.
- Do not include private contact details unless explicitly selected by an authorized admin and required for the report.
- Provide a download action and clear filename.

The generator should also support attendance reports from the Attendance section. Prefer one reusable PDF/report service rather than separate duplicated generators.

### Tool B: Attendance
See Section 6 below. The Tools tab may provide a shortcut to Attendance, but Attendance must also have its own main navigation entry.

---

# 6. Attendance Management

Attendance is a core feature and must be accurate, auditable and easy to use on a phone.

## Admin attendance marking
Admins and authorized Batch 4 representatives can:
- Select date.
- Select module/subject.
- Select relevant class/session.
- View the appropriate student list.
- Mark each student Present or Absent.
- Use quick actions such as “Mark all present” followed by exceptions.
- Save attendance.
- Edit/correct attendance with a reason and audit record.
- Avoid duplicate attendance sessions for the same module/date/class unless an authorized admin intentionally creates a separate session.

Make the attendance marking screen fast and thumb-friendly. Show clear save status and prevent accidental duplicate submissions.

## Attendance dashboard and filters
Provide filters for:
- Student.
- Index number.
- Course/batch.
- Module.
- Specific date.
- Date range.
- Week.
- Month.
- Attendance status.

Display:
- Present count.
- Absent count.
- Attendance percentage.
- Module-wise attendance.
- Student-wise attendance.
- Date-wise attendance.
- Trends over time.

## Detailed reports
Admins must be able to generate:
- A single-day report.
- Weekly report.
- Monthly report.
- Custom date-range report.
- Module-wise report.
- Individual student attendance report.
- Course/batch attendance report.

Reports must show the selected filters, date range, module, counts and percentages clearly. Include a PDF export using the shared PDF generator.

Use a consistent timezone: `Asia/Colombo`. Store timestamps consistently (prefer UTC in the database) and display dates/times correctly in Sri Lanka time.

Attendance must be stored in Supabase and reflect saved changes when the page is refreshed or opened on another authorized device. Do not claim “real-time” unless the implementation truly supports it. Use efficient queries and avoid excessive polling.

---

# 7. Calendar and Timetable

Reuse the existing timetable information and automatic live-lecture update behaviour after inspecting the old implementation.

Calendar should display:
- Timetable by date/week.
- Module/subject.
- Lecturer or relevant session details, if available.
- Start and end time.
- Room/location or online link, if available.
- Current/upcoming/completed lecture status.

Admin controls:
- Create and edit timetable entries.
- Cancel a lecture.
- Mark a lecture postponed.
- Add a reason or announcement.
- Reschedule a postponed lecture.
- Restore/correct status.

The public/student-facing status should update based on the saved timetable and status. Use server/database time consistently and avoid unnecessary repeated API calls. Reuse existing proven logic where possible, but refactor it cleanly for the new architecture.

---

# 8. Assignments / Workspace – Admin First

Admin-only assignment scheduler in the first release.

Admins can:
- Create assignment/task announcements.
- Select module/course/batch or intended student audience.
- Add title and instructions.
- Set issue date and deadline.
- Add relevant links or permitted attachments.
- Edit, postpone or cancel an assignment.
- Mark important assignments.
- View upcoming and overdue items.

Students will later see relevant assignments in their Workspace. Do not expose admin creation/edit controls to students.

Provide clear deadline labels and date/time display in `Asia/Colombo`.

---

# 9. Chat – Low-Request, Manual Refresh Design

Create a Discord-inspired academic chat for the later student phase, with admin moderation available to admins.

Important performance requirement:
**Do not continuously poll the database and do not send requests on every small UI interaction.**

The user specifically wants a manual refresh model:
- Load messages when the Chat tab is opened.
- Provide a visible refresh icon/button.
- Load new messages only when the user taps Refresh, re-enters the Chat tab, or performs another deliberate refresh action.
- Do not run frequent background polling.
- Do not keep unnecessary Realtime subscriptions active.
- Do not fetch the whole history each time; use pagination/cursors and load older messages only when requested.
- Cache the last loaded messages locally where safe, then fetch only messages newer than the latest known message when refreshing.
- Prevent duplicate sends and duplicate records.
- Show the last refreshed time and a loading state.
- Clearly show that new messages may be available when the user refreshes.

Chat functionality planned:
- Shared division chat.
- Student profile image/name/course badge.
- Message timestamps.
- Reply to a message with a preview.
- Like/react to messages, with one vote/reaction per user per type and safe toggle behaviour.
- Poll creation with question and multiple options.
- Vote in polls and view results according to poll settings.
- Poll close/expiry and admin delete controls.
- Students can unsend their own messages, subject to a defined policy and audit/moderation requirements.
- Admins can remove inappropriate messages and manage polls.
- Admins can clear messages by a selected date range, with preview, confirmation and audit log.
- Study-material comments can appear as linked discussion activity rather than duplicated message records, if that feature is included in the student phase.

Do not create a large number of API requests for likes, reactions, poll counts or message refresh. Use efficient endpoints and transactions where suitable. Apply server-side authorization, rate limiting and validation.

---

# 10. Student Mode – Planned Later Phase

Do not spend the first implementation cycle building the full student interface. First complete and test Admin Mode.

After Admin Mode is stable, implement Student Mode with:
- One-time invitation activation.
- Student login using index number and password.
- Profile tab: students can edit allowed personal profile fields and view their own academic details.
- Attendance dashboard: students can view only their own attendance, with a clear visual summary and module/date breakdown.
- Calendar tab: timetable and live lecture status.
- Workspace tab: assignments, instructions and deadlines published by admins.
- Chat tab: shared chat, replies, likes and polls.
- Students must never see the admin student directory or other students' private details.
- Students cannot mark or edit attendance.
- Students cannot edit official academic fields.
- Students cannot create or change admin-published assignment schedules.

Student features should be activated only after the admin workflow and access controls have been verified.

---

# 11. Backup and Restore – Preserve and Improve Existing Feature

The old portal recently received a backup option. Inspect it carefully and identify exactly what it backs up and how restoration works.

The new project must include a reliable backup system, especially because it contains student personal data and attendance records.

Super Admin only:
- Create a manual backup.
- View backup history.
- Download authorized backup files.
- View backup date, size, status and scope.
- Restore from a selected backup after strong confirmation.
- Verify backup integrity before restore.
- Record backup and restore actions in audit logs.

Backup scope should be explicitly documented and configurable. Consider:
- Student records and private details.
- Student labels.
- Admin accounts/role metadata (never export password hashes or auth secrets unnecessarily).
- Modules and timetables.
- Lecture status history.
- Attendance sessions and attendance records.
- Assignment schedules.
- Chat messages, polls and votes, according to retention policy.
- Relevant application settings.

Important:
- Do not assume that a backup of the database includes uploaded files. Document and handle file/object backups separately if the app uses object storage.
- Never store backups in the public web directory.
- Never commit backups or real student data to GitHub.
- Encrypt sensitive backups at rest and restrict access.
- Use a safe restore process with a pre-restore backup, validation and explicit confirmation.
- Avoid implementing an unsafe “restore everything” button without safeguards.
- Preserve the old backup feature's useful behaviour, but do not copy insecure or incompatible code blindly.
- Clearly state which data is and is not included in each backup.

---

# 12. Free-Plan and Request Efficiency

Optimize the application for low-cost/free-tier usage without making it feel slow.

The goal is fewer unnecessary requests and a smooth user experience.

Requirements:
- No aggressive polling.
- No repeated fetches on every render.
- No duplicate requests caused by component remounts.
- Cache relatively stable data such as module lists, timetable definitions and student list metadata where appropriate.
- Invalidate/update caches after successful edits.
- Use pagination for large lists and chat history.
- Use server-side filtering and search for large datasets.
- Fetch only fields needed by each screen.
- Use database indexes for common filters and joins.
- Prefer aggregate queries for dashboard counts rather than downloading every row.
- Debounce search input.
- Do not query on every keystroke.
- Avoid unnecessary Realtime subscriptions; use manual refresh for chat.
- Load dashboard sections progressively if that improves perceived performance.
- Compress and resize profile images before upload where appropriate.
- Avoid repeated downloads of the same PDF/image.
- Use appropriate cache headers for safe static assets.
- Batch related operations where safe.
- Avoid N+1 database queries.
- Add sensible request timeouts and retry only transient failures with bounded backoff.
- Never retry destructive actions automatically.
- Show cached data with a refresh action when appropriate.
- Do not sacrifice correctness, security or data integrity just to reduce requests.

Document expected database/API request patterns for major screens and identify any costly operations.

---

# 13. APK Preparation

The first deliverable is a responsive web app. The user plans to create an Android APK after the web app is complete.

Prepare the architecture for a later APK wrapper:
- Mobile-first responsive layout.
- Touch-friendly navigation.
- Installable PWA support if appropriate.
- Proper app icon, manifest and theme colour.
- Safe authentication/session handling on mobile.
- No dependency on desktop-only interactions.
- Handle offline/poor network states gracefully.

Do not build the APK yet. First finish, test and stabilize the web app. Recommend a suitable APK packaging approach only after inspecting the chosen stack and testing the web app on Android devices.

---

# 14. Security, Privacy and Reliability

- Validate all input on the server.
- Enforce roles and permissions on the server and database.
- Use RLS policies and least privilege.
- Keep service-role keys and secrets server-side.
- Protect private student details.
- Use secure session and password practices.
- Protect against XSS, CSRF where relevant, SQL injection and IDOR.
- Rate-limit login, invitation, upload and message endpoints.
- Audit sensitive admin actions, attendance edits, student record changes, deletions, backups and restores.
- Use soft deletion where auditability is important; define permanent deletion separately.
- Provide clear errors without exposing internal stack traces or secrets.
- Never log passwords, access tokens or full private student details.
- Use secure production headers and HTTPS.

---

# 15. Testing and Quality Gates

Before calling a feature complete:
- Test on small Android/mobile viewport sizes.
- Test tablet and desktop layouts.
- Test admin role and Super Admin role separately.
- Verify representatives cannot access Super Admin-only controls or endpoints.
- Verify students cannot access admin data or endpoints when Student Mode is later enabled.
- Test student data import counts and field accuracy.
- Test search, filters, labels and copy buttons.
- Test PDF generation and page breaks.
- Test attendance marking, editing, filtering and PDF reports.
- Test timetable status changes and live lecture logic.
- Test assignment scheduling and deadlines.
- Test backup creation, integrity validation and restore in a safe test environment.
- Test manual chat refresh and confirm no background polling is occurring.
- Test error, empty, loading and offline states.
- Run lint, type checks, tests and production build.
- Check for secrets and private student data before Git commit.

Do not claim tests passed unless they were actually run. Document tests that could not be run.

---

# 16. GitHub Readiness and Safe Cleanup

The new project should be clean and ready for a manual GitHub push.

- Create a suitable `.gitignore`.
- Keep `.env` and all secrets out of Git.
- Keep database dumps, backup files, private student exports, logs and generated PDFs out of Git.
- Remove only files proven to be unused or unnecessary.
- Before deleting a file, search for references and verify it is not needed by build, deployment, backup or runtime scripts.
- Do not delete the existing backup functionality or its required files.
- Do not remove useful documentation or migration files.
- Avoid unnecessary dependencies.
- Ensure scripts and build commands are correct.
- Create a clear README with setup, environment variables, migrations, backup/restore, roles and deployment steps.
- Add `.env.example` with placeholders only.
- Run a final secret scan and build.

Do not push to GitHub, deploy or run production migrations automatically. Prepare the changes for user review and provide exact commands for a manual commit and push.

---

# 17. Required Work Stages

Work in stages and report at the end of each stage.

## Stage 1 – Discovery and New Folder
- Inspect old project.
- Create `D:\UCR-Portal-New`.
- Create `OLD_PROJECT_DISCOVERY.md`.
- Create an asset/data migration inventory.
- Do not import private data or change the old project yet.
- Ask the user to review the report.

## Stage 2 – New Project Foundation
After approval:
- Set up the new project in the new folder.
- Configure new Supabase project integration using placeholders and documented setup.
- Create shared design system, navigation and responsive layouts.
- Implement authentication and role architecture.
- Build Admin Mode shell.

## Stage 3 – Admin Core
- Students management.
- Labels and detailed student records.
- List/PDF generator.
- Attendance management and reports.
- Calendar/timetable and lecture status.
- Assignment scheduler.
- Backup/restore controls for Super Admin.

## Stage 4 – Validation and Data Migration
- Review mapping with user.
- Import approved student data into the new Supabase database.
- Validate counts and fields.
- Test backup/restore on non-production data.

## Stage 5 – Student Mode
Only after admin core is stable:
- Student one-time activation and login.
- Profile.
- Personal attendance dashboard.
- Calendar.
- Workspace.
- Chat, likes, replies and polls.

## Stage 6 – Final Optimization and Release Preparation
- Mobile performance.
- Free-tier request optimization.
- Security review.
- Responsive testing.
- APK-readiness review.
- GitHub cleanup and production build.

---

# 18. Final Instructions to Antigravity

Start with **Stage 1 only**.

The immediate task is to inspect the old project, collect and document all relevant information, and create the new project folder at:

`D:\UCR-Portal-New`

Do not start implementing all features immediately. Do not import student personal data until the user reviews and approves the discovery report and migration plan.

Do not alter the old project, its production database, or its deployment.

At the end of Stage 1, report:
1. Exact old project path inspected.
2. Exact new folder created.
3. Technology stack discovered.
4. Student record count and fields actually found.
5. Existing PDF generator details.
6. Existing timetable/live lecture logic.
7. Existing backup/restore details.
8. Existing authentication and admin role details.
9. Reusable assets and code identified.
10. Missing information requiring the user's decision.
11. Proposed new architecture and migration plan.
12. Risks and recommended next steps.

**The user's priority is a premium, fast, easy-to-use, mobile-first Admin Mode. Build the foundation carefully so the future Student Mode and Android APK can be added without redesigning the whole system.**
