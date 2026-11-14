# UCR Student Portal — Production Hardening, Cleanup & Free-Tier Optimization

## Antigravity master implementation prompt

You are working inside the **existing UCR Student Portal project**. The portal has already been developed and connected to its intended Supabase database, Cloudflare R2 storage, and Render deployment. Features and code may have changed since earlier implementation prompts.

Your task is to audit, stabilize, optimize, secure, and prepare the current project for a safe GitHub push and Render deployment.

**Do not rebuild the app from scratch. Do not replace working architecture just for preference. Do not disconnect, reset, recreate, truncate, or overwrite the currently connected production Supabase database or its real student records.**

The goal is a clean, secure, fast, mobile-first production application that uses free services efficiently and does not waste database requests, storage operations, bandwidth, or compute.

---

# 1. Mandatory first step — inspect the actual current project

Before changing code, inspect:

- Project structure, framework, build scripts, routes, and navigation.
- All current Admin, Representative, and Student features.
- Authentication, roles, authorization, and invitation-code flow.
- Supabase project configuration, schema, migrations, indexes, RLS policies, RPCs, Edge Functions, and storage usage.
- Cloudflare R2 upload, download, and backup code.
- Render build/start commands, environment variables, health checks, and deployment configuration.
- Current data-fetching, caching, Realtime, and background-job behavior.
- PDF and Excel generation.
- Existing tests, demo fixtures, seed scripts, preview routes, and sample accounts.
- Git status, ignored files, tracked secrets, generated files, and repository history where relevant.

Create `PROJECT_PRODUCTION_AUDIT.md` containing:
- Existing architecture and deployed services.
- Features that are genuinely connected to the database.
- Features that still use mock/static/demo data.
- Security risks and severity.
- Unused or duplicate code candidates.
- Current performance/request bottlenecks.
- Free-tier usage risks.
- Render/GitHub deployment readiness.
- A safe implementation plan.

Do not assume that an old README accurately describes the current code. Treat the code and live configuration as the source of truth.

---

# 2. Preserve real database-connected records

This is a critical requirement.

- Keep the existing connected Supabase project and its current real records.
- Keep existing student IDs, index numbers, authentication relationships, invitation status, attendance sessions, attendance marks, assignments, chat messages, timetable entries, and other legitimate records.
- Keep existing relationships, foreign keys, RLS policies, and storage references unless a reviewed migration is genuinely required.
- Do not replace real records with hard-coded arrays, JSON fixtures, localStorage data, or demo records.
- Remove mock data from production UI paths only after verifying that the real database query and empty/error states work.
- If a feature is not connected to the database, report it honestly; do not fake a successful save.
- Never run `TRUNCATE`, broad `DELETE`, database reset, destructive seed, or schema recreation against the connected production database.
- Do not delete old migrations or rewrite migration history to make the project look clean.
- Before any schema change, create a reviewed forward-only migration and explain its impact.
- Prefer additive, backward-compatible migrations.
- Backups must be verified before any approved high-risk database change.

If a record appears to be demo/test data but may be real, **do not delete it automatically**. List it for review and ask for approval. Only remove clearly identified demo accounts/fixtures from the application code and test environment, not real user records.

---

# 3. Remove demo accounts, previews, and mock features safely

Inspect the entire project for:
- Demo login buttons and demo credentials.
- Public preview accounts or preview-mode routes.
- Sample student/admin accounts.
- Mock dashboards and fake attendance.
- Hard-coded student lists or fake profile details.
- Static assignment/chat/timetable examples used as if they were live.
- Development-only bypasses or authentication shortcuts.
- Test API endpoints exposed in production.
- Fake success notifications and placeholder actions.
- Debug panels, debug routes, temporary banners, and test controls.
- Seed scripts that could accidentally run in production.

Remove or disable production access to these items.

Important safeguards:
- Do not delete actual student/admin accounts from Supabase just because they were once used for testing. Verify their identity and obtain approval before deleting database users.
- Keep safe automated test fixtures in a separate test environment where needed.
- Do not remove useful development tooling that is properly disabled in production.
- Do not expose preview routes or test credentials in the deployed application.
- Ensure a production build cannot accidentally enable demo mode through a public environment variable.
- Remove fake data fallbacks that conceal database errors. Show honest loading, empty, and error states instead.

Create `DEMO_AND_MOCK_DATA_AUDIT.md` listing what was found, what was removed, what was retained for tests, and anything requiring user approval.

---

# 4. Safe code cleanup — remove unnecessary files and code

Find and remove genuinely unused:
- Components, pages, hooks, utilities, and styles.
- Duplicate components or competing implementations.
- Abandoned prototypes and old test pages.
- Unused dependencies and packages.
- Dead CSS, unused assets, and duplicate images/fonts.
- Temporary build outputs, logs, caches, and generated files that should not be committed.
- Obsolete scripts and outdated documentation.
- Unused API routes and abandoned endpoints.
- Unreferenced files only after confirming they are not loaded dynamically or used by deployment/build scripts.

Do not:
- Delete files based only on their names.
- Remove migrations, database types, generated clients, or deployment configuration without understanding their purpose.
- Delete assets referenced by CSS, manifests, dynamic imports, or database content.
- perform broad formatting/refactoring that creates unnecessary diffs.
- upgrade every dependency automatically.
- change frameworks or replace the router/data-fetching library without a measured reason.

Use dependency analysis, import/reference searches, build checks, and tests before deleting files.

Create `CLEANUP_REPORT.md` with:
- Deleted files and why.
- Dependencies removed and why.
- Duplicate systems consolidated.
- Files intentionally retained.
- Any uncertain candidates left untouched.

---

# 5. Security hardening — fix real risks

Perform a security review of frontend, backend, Supabase, R2, and deployment configuration.

## Authentication and authorization
- Enforce permissions on the server/database, not only by hiding UI elements.
- Verify Student, Representative, Admin, and Super Admin access boundaries.
- Students can access only their own profile, attendance, and permitted learning content.
- Representatives can access only their authorized cohort/batch and allowed operations.
- Super Admin-only operations must be protected server-side.
- Check every sensitive API/Edge Function/RPC for authentication and role validation.
- Prevent IDOR vulnerabilities by verifying resource ownership and scope for every requested record.
- Use secure session handling and safe logout/account-switch behavior.
- Add reasonable login, invitation-code, and sensitive-action rate limits.
- Prevent invitation token guessing, reuse, cross-student redemption, and unauthorized regeneration.
- Do not trust student IDs, role values, cohort IDs, prices, or permissions supplied by the browser.

## Supabase and database
- Review all RLS policies table by table.
- Ensure RLS is enabled on tables exposed through the API.
- Check `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies independently.
- Check policies for views, functions, and storage objects where applicable.
- Use least-privilege access.
- Never put the Supabase service-role key in frontend code or `VITE_`, `NEXT_PUBLIC_`, or other public environment variables.
- Ensure public/anonymous keys are used only with correct RLS.
- Review SECURITY DEFINER functions, search paths, grants, and execution permissions.
- Avoid returning private student details in broad list endpoints.
- Avoid logging personal information or tokens.

## Cloudflare R2
- Keep R2 secret access keys server-side only.
- Never expose account secrets in browser bundles, source maps, Git history, or logs.
- Use private buckets unless a specific asset is intentionally public.
- Validate upload permissions, file type, size, and object ownership.
- Prevent users from overwriting or reading another user's private objects.
- Use signed URLs or an authenticated backend for private downloads.
- Do not rely on obscure object names as authorization.

## Web application
- Validate and sanitize user input on the server.
- Protect against XSS, SQL injection, CSRF where relevant, open redirects, path traversal, unsafe file uploads, and insecure direct object references.
- Use safe rendering for chat, polls, comments, assignment descriptions, and student-provided text.
- Add appropriate security headers, including a considered Content-Security-Policy, frame protections, MIME sniffing protection, and referrer policy.
- Do not break required Supabase/Render/R2 functionality with an overly strict CSP; test it.
- Avoid exposing stack traces, environment variables, internal IDs, or secrets in user-facing errors.
- Review dependency vulnerabilities and remove abandoned/high-risk packages when a safe replacement or update is available.
- Keep lockfiles committed and reproducible.

Create `SECURITY_AUDIT.md` with severity, affected area, fix, and verification for every finding. Do not claim the app is secure merely because a scan passes.

---

# 6. Free-service optimization — Supabase, Render, and R2

The app must work smoothly while minimizing use of free-tier quotas. First inspect the actual account/service plan limits and current usage where available. **Do not assume that free-tier quotas are permanent or identical across accounts.** Document the limits verified at implementation time and identify any limits that cannot be inspected from code.

## Supabase request and database efficiency
- Fetch only fields actually needed.
- Add pagination for student rosters, chat history, and large attendance reports.
- Filter by authorized cohort, student, module, and date range in the database.
- Avoid fetching all student attendance records for a monthly dashboard.
- Avoid N+1 queries and repeated identical requests.
- Use joins or carefully designed RPC/server-side aggregation where they measurably reduce requests and data transfer.
- Add indexes for actual filtering, sorting, and joining patterns after checking query plans and existing indexes.
- Do not add indexes blindly; indexes also consume storage and increase write cost.
- Debounce search and avoid querying on every keystroke.
- Batch writes where safe.
- Prevent double submissions and duplicate requests.
- Use cursor pagination for large datasets where appropriate.
- Avoid unnecessary Realtime subscriptions and broad table listeners.
- Do not poll every few seconds for data that rarely changes.
- Use manual refresh or refresh-on-focus for low-priority data.
- Use Realtime selectively for genuinely live features such as active check-in status or a currently open chat.
- Subscribe only to the currently relevant authorized scope and unsubscribe on screen exit/logout.
- Use Realtime events to update targeted cache entries, not reload the entire app.
- Keep a reasonable connection/reconnect strategy.
- Use server-side pagination/aggregation for PDF and Excel reports rather than downloading the whole database into the browser.

## Cache behavior
- Reuse the existing cache/data-fetching library.
- Use a sensible stale-while-revalidate strategy.
- Show cached data immediately when safe, then refresh in the background.
- Invalidate only data affected by a successful write.
- Avoid refetching every dashboard section after a small change.
- Scope cache by user, role, cohort, and query filters.
- Clear user-specific cache on logout/account switch.
- Never treat cache as authorization.
- Avoid long-lived persistence of sensitive student data in localStorage.
- Provide a visible refresh state and a way to recover from stale data.

## Render efficiency
- Inspect current Render service type, sleep/spin-down behavior, build time, runtime, memory, and deployment configuration.
- Avoid unnecessary background workers, always-on processes, and duplicate web services.
- Do not run heavy PDF/Excel jobs synchronously on the main request if they cause timeouts or memory spikes; use a resource-appropriate approach.
- Cache safe static assets and use compression.
- Optimize server startup and avoid expensive initialization on every request.
- Ensure health checks are lightweight and do not query the entire database.
- Do not create aggressive health-check loops or unnecessary cron jobs.
- Keep logs concise and rotate/avoid excessive debug output.
- Explain cold-start behavior if the selected Render plan sleeps.
- Do not promise always-on performance if the free plan does not provide it.
- Keep the service deployable using the actual current Render plan and settings.

## Cloudflare R2 efficiency
- Upload only required files.
- Avoid duplicate uploads and unnecessary object copies.
- Use sensible object keys and metadata.
- Use direct-to-R2 uploads with short-lived signed authorization only if it is secure and reduces server load; otherwise retain the existing safe server-side upload.
- Do not make private student files public to reduce implementation effort.
- Avoid repeated full-file downloads when a safe cached/signed access pattern is possible.
- Check file size and allowed content types.
- Use a retention policy only after the user approves the desired retention period.
- Do not delete old backups automatically without an explicit, documented policy.
- Verify backup uploads and downloads, and distinguish database backups from file-storage backups.

Create `FREE_TIER_OPTIMIZATION.md` documenting:
- Actual services and plans detected.
- Verified limits/usage if accessible.
- High-cost request patterns removed.
- Caching and Realtime design.
- Render runtime/build optimizations.
- R2 storage/request optimizations.
- Remaining constraints and possible upgrade triggers.

---

# 7. Smooth UI and mobile-first experience

Keep the current UCR TV Studies brand, dark theme, and familiar navigation.

- Ensure tab switching is client-side and does not reload the entire document.
- Preserve app shell and avoid remounting all dashboard components.
- Use skeletons or small section-level loading indicators instead of blank screens.
- Avoid layout shifts and sudden content jumps.
- Use optimistic UI only for reversible actions and reconcile with the database result.
- Never show success before a save is confirmed.
- Disable duplicate submissions while requests are in progress.
- Show clear empty, error, offline, retry, and stale-data states.
- Keep buttons and controls touch-friendly.
- Avoid horizontal overflow on phones.
- Use responsive cards for data that would otherwise require wide tables.
- Keep calendar, attendance, chat, roster, and reports usable on small screens.
- Optimize images and use appropriate formats/sizes.
- Lazy-load non-critical pages and heavy tools.
- Respect reduced-motion preferences.
- Keep animations lightweight; do not add effects that slow lower-end phones.
- Test on narrow Android/iPhone viewports and desktop.

Do not redesign every screen unnecessarily. Preserve working visual elements and improve inconsistent or broken interactions.

---

# 8. Production data correctness and reliability

- All production student, attendance, timetable, assignment, chat, invitation, and profile information must come from the connected database/storage services.
- Remove fake fallbacks that display invented records.
- Provide clear empty states when no database record exists.
- Distinguish loading, empty, permission denied, network failure, and server failure.
- Retry only safe idempotent operations.
- Prevent duplicate attendance sessions, marks, invitation redemption, chat sends, and check-ins using database constraints where appropriate.
- Use transactions/RPCs for multi-step writes that must succeed together.
- Record created/updated timestamps and actor IDs for important administrative actions.
- Keep timezone handling consistent for academic dates (`Asia/Colombo`).
- Do not silently change historical attendance when timetable configuration changes.
- Ensure PDF/Excel exports are generated from current authorized database records.
- Do not expose unrelated private student data in reports.

---

# 9. File upload and storage hardening

Review profile images, PDFs, assignment attachments, chat attachments, and other uploaded files.

- Enforce file size and MIME/type limits server-side.
- Do not trust file extensions alone.
- Use safe generated object names rather than user-provided paths.
- Prevent path traversal and unauthorized overwrite.
- Check ownership and role before upload, view, delete, or replace.
- Keep private student documents private.
- Validate PDF and image handling.
- Avoid storing duplicate copies in Supabase Storage and R2 without a clear reason.
- Document which storage service owns each file category.
- Handle failed uploads cleanly and avoid orphaned database records or objects.
- Add cleanup for orphaned temporary uploads only when ownership and age can be verified safely.
- Do not delete files referenced by real database records.

---

# 10. GitHub-ready repository

Prepare the project for a clean, safe GitHub push.

## Repository cleanup
- Remove unnecessary generated files, build outputs, local caches, logs, temporary exports, and OS-specific files.
- Keep required lockfiles, migrations, source assets, and deployment configuration.
- Add or update `.gitignore` for framework outputs, `node_modules`, local environment files, logs, test artifacts, and secrets.
- Do not ignore files required to build or deploy.
- Ensure `.env`, `.env.local`, `.env.production`, service account files, private keys, R2 credentials, database dumps, and personal student exports are not tracked.
- Check Git history for previously committed secrets. If any were committed, report them and recommend rotation; removing a secret from the latest commit does not invalidate old exposure.
- Do not rewrite Git history or force-push without explicit approval.
- Do not include real student data, production backups, private uploads, or database exports in the repository.
- Keep a safe `.env.example` containing variable names and harmless placeholders only.
- Ensure no secret values appear in README, screenshots, test fixtures, source maps, or CI logs.
- Use consistent formatting/linting without creating massive unrelated diffs.

## Documentation
Update the main `README.md` with:
- Project overview and features.
- Technology stack.
- Local development setup.
- Required environment variable names and where to obtain them (never values).
- Supabase setup and migration instructions.
- R2 setup and private/public file behavior.
- Render deployment steps.
- Build, lint, type-check, and test commands.
- Admin/Representative/Student role overview.
- Backup and restore notes.
- Known free-tier limitations.
- Troubleshooting.
- Security and contribution notes.

Do not put actual account IDs, URLs containing secrets, tokens, or private student details in documentation.

---

# 11. Render deployment readiness

Inspect the actual repository and Render service configuration.

- Verify the correct build command and start command.
- Ensure the app binds to the port supplied by Render (`process.env.PORT` or framework equivalent).
- Ensure the host binding is compatible with Render.
- Confirm the production build succeeds from a clean install.
- Confirm the service does not depend on local files that disappear on redeploy/restart.
- Use persistent storage only where explicitly supported and needed; use R2 for appropriate object storage.
- Confirm required environment variables are configured in Render without printing values.
- Separate public client configuration from server-only secrets.
- Ensure migrations are not automatically destructive during deployment.
- Use a safe migration procedure with backup and review.
- Add a lightweight health endpoint if appropriate; do not expose secrets or internal diagnostics.
- Confirm SPA fallback/routing works on direct deep links if applicable.
- Check build logs and runtime logs for errors and secrets.
- Confirm a failed deployment does not trigger a destructive data operation.
- Document how to roll back to the last working deployment.

Do not change or remove the existing Render service without approval. Do not assume the user wants a new service.

---

# 12. GitHub Actions and automated checks

Add or improve a lightweight CI workflow if the project does not already have one.

On pull request/push, run appropriate checks:
- Clean dependency install using the committed lockfile.
- Lint.
- Type check.
- Unit tests.
- Production build.
- Dependency/security audit where supported.

CI must not:
- Connect to production Supabase for test writes.
- Print secrets.
- run destructive migrations.
- require paid hosted runners or services without approval.
- deploy automatically from untrusted pull requests.

Use mocked/unit tests or a separate isolated test environment. Keep the workflow efficient and avoid unnecessary repeated builds.

---

# 13. Backups and recovery

- Verify the existing R2 backup workflow still works.
- Confirm the backup is a real, readable artifact and not just a success message.
- Verify upload, object existence, size, and download integrity.
- Clearly document whether a backup includes database schema/data, storage objects, and configuration metadata.
- Keep secrets out of backups where possible; if sensitive data must be included, document encryption and access controls.
- Never expose backup download links publicly.
- Do not automatically delete older backups.
- Test restore only in an isolated database/environment.
- Document a manual recovery procedure and rollback path.
- Take/verify a backup before approved schema or data migrations.

---

# 14. Performance and quality measurement

Capture a baseline before optimizing, then compare after changes.

Measure:
- Initial page load and bundle size.
- Dashboard time to usable content.
- Attendance time to usable content.
- Number of Supabase requests when switching tabs.
- Duplicate requests.
- Query duration and returned row counts where available.
- Realtime subscription count.
- Build time and server startup time.
- Mobile layout issues and console errors.

Do not invent performance numbers. If a metric cannot be measured, mark it “not measured” and explain how to measure it.

Set practical goals:
- No full-page reload when changing tabs.
- No unnecessary full-database fetches.
- Cached screens render promptly while revalidating.
- Only affected data refreshes after a write.
- No duplicate active subscriptions for the same screen/user.
- No avoidable layout overflow on mobile.
- Production build and key user flows pass.

Create `PERFORMANCE_REPORT.md` with before/after measurements and remaining bottlenecks.

---

# 15. Required test plan

Use a separate development/test Supabase project or isolated test schema for any tests that write data. Never create demo records in the real production database.

Test these user journeys:

### Authentication and permissions
- Student login and logout.
- Admin/Representative login and logout.
- Invitation code use, expiry, revocation, and single-use behavior.
- Student cannot read another student's private data.
- Representative cannot access an unauthorized cohort.
- Super Admin-only actions are denied to other roles.

### Main features
- Dashboard.
- Student roster and filters.
- Student profile.
- Attendance calendar and admin marking.
- Timetable and live lecture state.
- Assignment/workspace.
- Chat, comments, and polls.
- Student check-in.
- PDF and module-separated Excel exports.
- Profile/file uploads.
- R2 backup and safe test restore.

### Reliability and UX
- Tab switching does not reload the whole app.
- Cached data is scoped correctly.
- Relevant changes update promptly.
- Offline/network failure displays a useful message.
- Duplicate clicks do not duplicate writes.
- Empty states are correct.
- Small mobile viewport has no horizontal overflow.
- Direct page URLs work after refresh.

### Deployment
- Clean production build.
- Render start/health check.
- Environment variable validation without exposing values.
- No secrets in Git.
- No demo accounts or public preview routes.
- No fake production data.

Create `PRODUCTION_READINESS_TEST_REPORT.md` with each test marked Pass, Fail, Blocked, or Not Tested, including evidence and follow-up.

---

# 16. Required deliverables

Create/update these files:

1. `README.md` — final project setup, features, deployment, and troubleshooting.
2. `PROJECT_PRODUCTION_AUDIT.md` — current architecture and findings.
3. `SECURITY_AUDIT.md` — security risks and verified fixes.
4. `DEMO_AND_MOCK_DATA_AUDIT.md` — removed/retained demo and mock elements.
5. `CLEANUP_REPORT.md` — deleted/retained files and dependency cleanup.
6. `FREE_TIER_OPTIMIZATION.md` — Supabase, Render, and R2 efficiency plan.
7. `PERFORMANCE_REPORT.md` — before/after measurements.
8. `PRODUCTION_READINESS_TEST_REPORT.md` — honest test results.
9. `.env.example` — variable names and safe placeholders only.
10. `.gitignore` — complete and verified.

Also provide:
- Exact list of changed, added, and deleted files.
- Database migrations created and why.
- Any manual Supabase/Render/R2 configuration still needed.
- Environment variable names only.
- Git commands for reviewing and pushing safely.
- Deployment and rollback instructions.
- All tests not run and why.
- Risks or changes that require the user's approval.

---

# 17. Safe Git push procedure

Do not push automatically unless the user explicitly authorizes it.

Before recommending a push:
1. Run `git status`.
2. Review the full diff.
3. Check for `.env` files, secrets, database dumps, backups, private student exports, and generated files.
4. Run secret scanning if available.
5. Run lint, type-check, tests, and production build.
6. Confirm migrations are non-destructive and reviewed.
7. Confirm the connected production database has not been reset or modified by demo tests.
8. Confirm documentation does not contain secrets or private student data.
9. Summarize changes and any unresolved risks.

Provide the commands for the user to review and push. Never force-push, rewrite history, or deploy a destructive migration without explicit approval.

---

# 18. Final acceptance checklist

- [ ] Existing Supabase project remains connected.
- [ ] Real student and academic records are preserved.
- [ ] Production UI uses real database-connected records, not mock fallbacks.
- [ ] Demo accounts/previews are removed from production safely.
- [ ] No real database user or record was deleted without approval.
- [ ] Unused code and dependencies are removed only after verification.
- [ ] Security risks are audited and important issues fixed.
- [ ] RLS and role boundaries are tested.
- [ ] R2 credentials and Supabase service-role secrets remain server-side.
- [ ] Free-tier usage is minimized and documented.
- [ ] No unnecessary polling or broad Realtime subscriptions.
- [ ] Dashboard and Attendance are responsive and cache effectively.
- [ ] Mobile UI is smooth and usable.
- [ ] GitHub repository contains no secrets or private data.
- [ ] Render build/start/deep links work.
- [ ] R2 backup upload/download integrity is verified.
- [ ] Production build, tests, and key flows pass.
- [ ] README and all audit reports are updated.
- [ ] No unapproved destructive database operation or deployment occurred.

## Final instruction to Antigravity

Work carefully in the existing repository. Audit first, then make small, verifiable changes. Prioritize data safety, security, free-tier efficiency, real database integration, mobile performance, and reliable Render deployment. Remove unnecessary code and production demo/preview functionality, but do not delete uncertain files or real database records. Do not replace working features with placeholders. Do not claim a feature is fixed, secure, optimized, backed up, or deployment-ready unless you have actually tested it and documented the evidence.

At the end, provide a concise summary of what changed, what was tested, what remains, and whether the project is genuinely ready for a GitHub push and Render deployment.
