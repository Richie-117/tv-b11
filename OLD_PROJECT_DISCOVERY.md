# UCR Portal Discovery Report (Stage 1)
**Document version:** 1.0.0  
**Generated at:** 2026-11-12T22:54:00+05:30  
**Status:** Completed — Pending User Approval for Stage 2  
**Target Path:** `D:\UCR-Portal-New\OLD_PROJECT_DISCOVERY.md`  
**Source Path Inspected:** `c:\Users\user\Desktop\ucr_portalb2` (Read-only, no modifications made)

---

## Executive Summary

As required by **Stage 1** of the implementation plan in `UCR_New_Portal_Antigravity_README.md`, an exhaustive, non-destructive inspection of the existing UCR portal was conducted. The target directory `D:\UCR-Portal-New` has been created on the `D:` drive as an isolated repository. 

No files in the old project (`c:\Users\user\Desktop\ucr_portalb2`) were altered, deleted, or overwritten. No database migrations were executed, and no private student data was imported into any new database.

This document inventories the full technology stack, data records, business logic, reusable components, and architectural gaps in the existing portal, followed by concrete recommendations and decisions requiring user approval before proceeding to **Stage 2 (New Project Foundation)**.

---

## 1. Project Overview & Technology Stack

| Component | Existing Project Implementation | Notes / Observations |
| :--- | :--- | :--- |
| **Framework** | Next.js 14.2.24 (App Router) | React 18.3.1, TypeScript 5.7.2 |
| **Styling** | Tailwind CSS 3.4.16 | Custom dark theme (`#06111F` navy, `#FF7900` orange, `#24A8FF` blue) |
| **Icons** | Lucide React 0.468.0 | Standard touch-friendly icon system |
| **Primary Database** | Supabase PostgreSQL | 5 applied migrations (`supabase/migrations/`) |
| **Fallback Storage** | Local JSON file (`data/db.json`) | In-memory cache with fallback read/write |
| **PDF Engine** | `jspdf` 4.2.1 + `jspdf-autotable` 5.0.9 | Client-side vector PDF generation with custom headers & pagination |
| **Authentication** | JWT via `jose` (5.9.6) + `bcryptjs` (2.4.3) | HTTP-only cookies (`ucr_auth_token` for Admin, `ucr_student_token` for Student) |
| **Cloud Storage** | Cloudflare R2 (`@aws-sdk/client-s3`) + Supabase Storage | Dual configuration: Supabase bucket `portal-media` & Cloudflare R2 bucket |
| **Timezone Logic** | `Intl.DateTimeFormat` (`Asia/Colombo`) | Dedicated time calculation service (`src/lib/timetableService.ts`) |

---

## 2. Student Records & Inventory Verification

### 2.1 Student Record Count: 48 Verified Enrolled Students
A critical discrepancy between documentation and actual database records was thoroughly investigated:
- `course_names.txt` and `seed-data.ts` contain 58 raw entries (29 TPOPT + 29 TPRPT) representing the initial candidate list.
- **The canonical, active database (`data/db.json` and backup snapshot `database.json`) contains exactly 48 verified students**:
  - **TPOPT (Television & Digital Media Post Production Technology): 26 students** (`RT/TPOPT/26/01` to `RT/TPOPT/26/26`)
  - **TPRPT (Television & Digital Media Production Technology): 22 students** (`RT/TPRPT/26/01` to `RT/TPRPT/26/23`, with index `RT/TPRPT/26/08` confirmed resigned by administrator and excluded)
  - **Total verified active students:** **48**

### 2.2 Field Inventory & Population Analysis
Every student record was analyzed for field population across the 48 records:

| Field Name | Type | Population (out of 48) | Status & Analysis |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | 48 (100%) | Verified format: `student-tpopt-001` .. `student-tprpt-023` |
| `fullName` | `TEXT` | 48 (100%) | Complete official student names |
| `studentNumber` | `TEXT` | 48 (100%) | Standard index format: `RT/TPOPT/26/XX` and `RT/TPRPT/26/XX` |
| `course` | `TEXT` | 48 (100%) | Strictly `TPOPT` (26) or `TPRPT` (22) |
| `batch` | `TEXT` | 48 (100%) | Standardized: `Batch 11 — 2026` |
| `gender` | `TEXT` | 48 (100%) | Fully populated (`Male` or `Female`) |
| `isRepresentative` | `BOOLEAN` | 48 (100%) | `true` for 4 representatives, `false` for 44 regular students |
| `representativeRole` | `TEXT` | 4 (8.3%) | Only populated for the 4 representatives |
| `phoneNumber` | `TEXT` | 4 (8.3%) | **Only populated for the 4 representatives**. 44 regular students have no phone number on record |
| `profileImageUrl` | `TEXT` | 4 (8.3%) | Only populated for representative Hesan Samudika (`https://i.postimg.cc/CLZ7ckhZ/hesan.png`) and default placeholders |
| `notes` | `TEXT` | 4 (8.3%) | Contains representative appointment notes |
| `email` | `TEXT` | 0 (0%) | **Not recorded** for students in old database |
| `residentialAddress`| `TEXT` | 0 (0%) | **Not recorded** in old database |
| `parentGuardianName`| `TEXT` | 0 (0%) | **Not recorded** in old database |
| `parentPhoneNumber` | `TEXT` | 0 (0%) | **Not recorded** in old database |
| `emergencyContact`  | `TEXT` | 0 (0%) | **Not recorded** in old database |
| `studentLabels`     | `TEXT[]` | 0 (0%) | Not implemented in old database |

> [!IMPORTANT]
> **Data Integrity Rule**: No missing personal data (emails, parent details, addresses) will be fabricated or guessed. The new schema will provide nullable, securely encrypted fields and allow authorized administrators to populate them gradually.

---

## 3. Batch Representatives & Admin Roles

### 3.1 The Four Batch Representatives
The 4 representatives identified from the verified records are:

1. **P.A. Hesan Samudika**
   - Course: `TPOPT`
   - Role: `Male Representative`
   - Phone: `+94 78 897 8729` (Also previously recorded as `+94 77 482 9104` in seed data)
   - Photo: `https://i.postimg.cc/CLZ7ckhZ/hesan.png`
   - Notes: Appointed batch representative for TPOPT intake 2026.
2. **P. Tharushika Nethmi**
   - Course: `TPOPT`
   - Role: `Female Representative`
   - Phone: `+94 77 952 0533` (Also previously recorded as `+94 71 593 1820` in seed data)
   - Notes: Appointed batch representative for TPOPT intake 2026.
3. **M. Rafidh Rizwan**
   - Course: `TPRPT`
   - Role: `Male Representative`
   - Phone: `+94 76 372 6829` (Also previously recorded as `+94 76 839 2041` in seed data)
   - Notes: Appointed batch representative for TPRPT intake 2026.
4. **Yenuki Ruhansa Atapattu**
   - Course: `TPRPT`
   - Role: `Female Representative`
   - Phone: `+94 71 215 4389` (Also previously recorded as `+94 70 318 4952` in seed data)
   - Notes: Appointed batch representative for TPRPT intake 2026.

### 3.2 Authentication & Admin Hierarchy Discovered
- **Existing Admin Account in old database**: Exactly 1 Super Admin account:
  - Username: `ucrtvrepb11`
  - Name: `Television Studies Administrator`
  - Email: `hesansamudika20@gmail.com`
  - Role: `superadmin`
- **Representative Limitation in Old Project**: The 4 representatives did NOT have distinct admin accounts in `admins` table. They were merely flagged in the student table with contact cards shown on the public site.
- **New Project Requirement**: In the new architecture, representatives will have dedicated admin accounts with scoped permissions (view/search students, mark attendance, edit lecture status, manage assignments, moderate chat) while strictly barring them from Super Admin privileges (such as managing Super Admin accounts, touching disaster backups, or changing system security settings).

---

## 4. PDF / List Generator Logic & Templates

The existing PDF generation logic (`src/lib/pdfGenerator.ts` and `src/components/tools/LiveDocumentPreview.tsx`) was inspected in detail:

- **Library**: `jspdf` and `jspdf-autotable`.
- **Supported Formats**:
  1. `simple`: Serial No, Name, Phone Number, Empty Signature Column.
  2. `with_id`: Serial No, Student ID, Name, Phone Number, Empty Signature Column.
  3. `with_course`: Serial No, Student ID, Name, Course, Batch, Phone Number, Empty Column.
  4. `custom`: Dynamic toggles for any combination of columns.
- **Layout & Typography**:
  - Font: `helvetica` (standard PDF core font; no custom TTF font embedded).
  - Page sizes: A4 and Letter.
  - Orientations: Portrait and Landscape.
  - Margin: 14mm standard margin.
  - Page header:
    - Dual logos: UCR Emblem (left) and UoVT University logo (right) fetched as Base64 Data URLs.
    - Centered headline (bold, 13pt), Division Name ("Division of Television Studies", bold, 11pt), Institution Name ("University College of Rathmalana", normal, 9.5pt), optional subtitle, metadata bar with generation date and course filter.
  - Table formatting:
    - Alternating/clean grid style with slate borders (`#505a64`), 8.5pt text.
    - Repeat table header on every page (`repeatHeader: true`).
    - Configurable blank handwriting rows (0 to 25 rows appended at bottom for extra physical entries).
    - Configurable empty handwriting column (title configurable, e.g., "Signature", "Attendance", "Marks"; width options: normal 26mm, wide 36mm, extra 46mm).
  - Page footer: Page number (`Page X`) and institutional disclaimer ("Division of Television Studies — University College of Rathmalana | Affiliated with UoVT").
- **Reuse Strategy for New Project**:
  - The core PDF generator will be preserved, refactored into a modern unified server/client export service.
  - It will be shared directly with the new Attendance reporting system to export daily, weekly, and module-level attendance sheets with matching typography and branding.

---

## 5. Timetable & Automatic Live-Lecture Status Logic

The old project contains a dedicated timetable engine (`src/lib/timetableService.ts`):

- **Timezone**: Evaluates strictly in `Asia/Colombo` (UTC+05:30) using `Intl.DateTimeFormat`. It does not rely on client device clocks.
- **Timetable Datasets**:
  - Two foundation timetables (`timetable-foundation-tpopt` and `timetable-foundation-tprpt`).
  - Each contains **70 time slots** covering Monday through Sunday from 08:30 to 16:30.
  - Slot types: `class`, `break`, `lunch`, `empty`.
- **Timetable Overrides Table (`timetable_overrides`)**:
  - Statuses: `POSTPONED` and `UNAVAILABLE` (Cancelled).
  - Allows specifying exception dates, reasons, and optional rescheduled start/end times.
  - Evaluated on demand against current day-of-week and time.
- **Status Evaluation Algorithm**:
  - Maps current time to minutes from midnight.
  - Detects active ongoing class, break, or lunch slot.
  - Checks if an active override exists for today's slot.
  - If no active slot, looks ahead for the next upcoming class slot today.
  - Returns one of 8 standardized status codes:
    1. `LECTURE_ONGOING`
    2. `UPCOMING_LECTURE`
    3. `BREAK`
    4. `LUNCH_BREAK`
    5. `POSTPONED`
    6. `UNAVAILABLE`
    7. `NO_LECTURE_SCHEDULED_TODAY`
    8. `SCHEDULE_UNAVAILABLE`
- **Reuse Strategy**:
  - Highly robust logic; will be adapted into the new project with cached database reads and clean mobile UI widgets.

---

## 6. Backup & Disaster Recovery Logic

The existing backup system (`src/lib/backupService.ts`, `scripts/backup.mjs`, `scripts/restore.mjs`) was analyzed:

- **What it backs up**: 22 database tables:
  `admins`, `students`, `student_profiles`, `student_invitations`, `learning_stages`, `modules`, `gallery`, `events`, `lecturers`, `timetables`, `timetable_overrides`, `study_feed_posts`, `study_post_attachments`, `material_audit_logs`, `community_polls`, `community_poll_options`, `community_poll_votes`, `community_chat_messages`, `study_post_comments`, `community_chat_reports`, `community_chat_audit_logs`, `site_settings`.
- **Backup Formats**:
  - JSON snapshot with table metadata and record counts.
  - SQL dump with generated insert statements.
- **Storage Locations in Old Project**:
  1. Local disk: `backups/backup-<TIMESTAMP>/`
  2. Cloudflare R2: `backups/ucr-backup-<TIMESTAMP>.json` via AWS S3 SDK.
  3. Direct browser download: `/api/admin/backup/export`.
- **Restoration**:
  - Upserts tables in foreign-key dependency order (`admins` -> `learning_stages` -> `modules` -> `students` -> ...).
- **Critical Gaps in Old Backup to Fix in New Project**:
  1. *No Attendance Data*: Attendance did not exist in the old database, so no attendance tables were backed up.
  2. *No Pre-Restore Safety Snapshot*: Restoring from a file directly overwrites/upserts without creating an automatic rollback checkpoint.
  3. *Unencrypted Storage*: Backups contain raw JSON without encryption at rest.
  4. *Object Storage Separation*: Uploaded media files (images/PDFs) are not included in database snapshots.

---

## 7. Attendance & Assignment Systems (Status in Old Project)

### 7.1 Attendance System
- **Old Project Status**: **Completely non-existent**. In the old codebase, the word "attendance" only appeared as a sample placeholder in the PDF generator tool. There were no database tables, marking screens, session records, or percentage calculations.
- **New Project Requirement**: A complete, mobile-first Attendance management system must be built from the ground up:
  - Database entities: `attendance_sessions`, `attendance_records`.
  - Fast mobile thumb-marking interface (Present / Absent, "Mark All Present" shortcut).
  - Attendance dashboard with filters (student, date, date range, module, course).
  - Attendance reports and instant PDF generation.

### 7.2 Assignment Scheduler
- **Old Project Status**: In the old codebase, assignments only existed as an optional date field (`assignment_deadline`) on student study feed posts.
- **New Project Requirement**: A dedicated Admin Assignment Scheduler:
  - Entity: `assignment_schedules`.
  - Fields: Title, instructions, course/batch/module target, issue date, due deadline, external links/attachments.
  - Overdue tracking, postponement controls, and status flags.

---

## 8. Asset & Code Migration Inventory

The following assets and logic files have been verified in `c:\Users\user\Desktop\ucr_portalb2` and catalogued for safe reference:

### 8.1 Image & Branding Assets (`public/images/`)
- `public/images/ucr.png` (968 KB) — Official University College of Rathmalana logo (transparent PNG, used in header & PDF).
- `public/images/uovt.png` (241 KB) — University of Vocational Technology crest (transparent PNG, used in header & PDF).
- `public/images/tpopt_cover.jpg` (831 KB) — TPOPT programme cover.
- `public/images/tprpt_cover.jpg` (931 KB) — TPRPT programme cover.
- `public/images/about_control_room.jpg` (916 KB) — Broadcast control room photo.
- `public/images/students_editing_suite.jpg` (815 KB) — Video editing lab photo.
- `public/images/hero_production.jpg` (866 KB) — Studio production camera crew.
- `public/images/film_set_practical.jpg` (1,009 KB) — Practical film lighting set.
- `public/images/gallery_field_shoot.jpg` (1,002 KB) — Field camera shoot.
- `public/images/event_screening.jpg` (910 KB) — Screening auditorium.
- `public/images/lecturers/*.jpg` (4 files, ~240 KB total) — Academic faculty headshots:
  - `teroshani_dahanayake.jpg` (Ms. Teroshani Dahanayake - Division Head)
  - `hrp_lal.jpg` (Mr. H.R.P. Lal - Lecturer)
  - `nirmani_perera.jpg` (Ms. Nirmani Perera - Lecturer)
  - `oshan_lakshitha.jpg` (Mr. Oshan Lakshitha - Lecturer)

### 8.2 Document & PDF Assets
- `public/timetables/TPOPT.pdf` (136 KB) & `TPRPT.pdf` (139 KB) — Original Foundation timetables.
- `TPOPT.pdf` & `TPRPT.pdf` (Root copies, identical checksums).

### 8.3 Curriculum & Academic Data
- 6 Modules (`POST-5101`, `PROD-5102`, `AUD-5103`, `PROD-5104`, `POST-5105`, `ENG-5100`).
- 6 Learning Stages (`Foundation`, `NVQ Level 5 Sem 1`, `NVQ Level 5 Sem 2`, `OJT 6 Months`, `Remaining Semesters`, `OJT 3 Months`).
- 2 Foundation Timetable definitions with 140 total slot records.

---

## 9. Data Missing & Items Requiring User Confirmation

Before proceeding to Stage 2 and future data migration stages, the following items require user clarification:

1. **Regular Student Contact Details**:
   - The old database only has phone numbers for the 4 batch representatives.
   - For the other 44 students: phone numbers, personal emails, residential addresses, and parent/guardian contacts do not exist in the old project.
   - *Confirmation needed*: Confirm whether admin manual entry or a future CSV upload will be used to complete these records.
2. **Batch 4 Representatives vs Batch 11 Terminology**:
   - The brief references "four Batch 4 representatives". However, all student numbers (`RT/TPOPT/26/XX`), timetable titles, and database records use "Batch 11 — 2026" (Intake 2026).
   - *Confirmation needed*: Confirm whether the display label should be "Batch 11" or if "Batch 4" refers to a specific sub-cohort or nomenclature.
3. **Storage Architecture Preference**:
   - Old project used both Supabase Storage and Cloudflare R2 (S3).
   - *Recommendation*: Standardize on **Supabase Storage** for the new portal to eliminate redundant external dependencies, keep all security policies inside Supabase RLS, and simplify disaster recovery backups.
4. **Initial Super Admin & Representative Credentials**:
   - The old superadmin username is `ucrtvrepb11`.
   - New admin logins must be created for the 4 representatives. Confirmation will be needed regarding preferred login formats (e.g., student index number as username or dedicated email addresses).

---

## 10. Proposed New Architecture & Implementation Roadmap

### 10.1 Tech Stack & Mobile UX Features
- **Framework**: Next.js 14 (App Router) + TypeScript.
- **Styling**: Tailwind CSS with mobile-first layout primitives (bottom sheets, thumb-friendly actions, responsive drawer).
- **Customizable Mobile Navigation (User Requested)**:
  - Mobile bottom navigation bar / drawer will feature an intuitive **Tab Customizer ("Customize Tabs" / Hide/Unhide toggle)**.
  - Allows administrators and users to pin, unpin, hide, or show only the specific tabs they actively use (e.g. keep only *Attendance*, *Students*, and *Timetable* visible on the mobile bottom bar).
  - Preference persisted in local storage / user profile settings for instant load without extra database queries.
- **Backend / DB**: New Supabase PostgreSQL project with robust Row Level Security (RLS) enforcing admin permissions on the server.
- **State & Request Optimization**: In-memory caching, manual-refresh chat pattern, debounced inputs, single-query aggregated dashboard stats.
- **APK Readiness**: Progressive Web App (PWA) manifest and responsive viewport structure ready for Capacitor / Android wrapper.

### 10.2 Next Steps (Awaiting User Approval)
- **Stage 1 (Current)**: Discovery complete. Target folder `D:\UCR-Portal-New` initialized. No changes made to old project.
- **Stage 2 (Next)**: After user approval:
  - Initialize the new Next.js project inside `D:\UCR-Portal-New`.
  - Establish design system, branding tokens, and mobile-first layout shells.
  - Configure Supabase database schema migrations with clean RLS policies.
  - Implement role-based authentication (Super Admin vs Representatives).
