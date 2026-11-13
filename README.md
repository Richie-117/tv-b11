# UCR Portal 2.0 — Division of Television Studies
**University College of Rathmalana (Affiliated with University of Vocational Technology - UoVT)**  
**Batch 11 — 2026 Intake Official Mobile-First Administration & Student Portal**

---

## 1. Overview & Architecture

UCR Portal 2.0 is an academic and administrative management portal purpose-built for the **Division of Television Studies** at the University College of Rathmalana.

The application operates in dark mode with official brand accents (`#0A0E17` deep canvas, `#111827` card background, `#0088FF` UoVT blue, `#FF7900` UCR orange). It is fully responsive, supporting smartphones, tablets, and desktop workstations.

---

## 2. Core Modules & Capabilities

### 2.1 Attendance System & Module-Separated Excel Engine
- **Shared Attendance Calculation (`src/lib/attendanceCalculations.ts`):**
  $$\text{Attendance Rate} = \frac{\text{Present Valid Sessions}}{\text{Present Valid Sessions} + \text{Absent Valid Sessions}} \times 100$$
  - Official tracking begins on **16 November 2026** (`Asia/Colombo`).
  - Pre-16 Nov 2026 orientation dates are never calculated as absences.
  - Cancelled, postponed, and not-held sessions are excluded from calculations.
  - Zero-denominator state displays `"No attendance data"` / `"Not available"` instead of a misleading `0%`.
- **Module-Separated Excel Export Engine (`src/lib/excelExport.ts` via `exceljs`):**
  - Exports an Excel workbook with a **dedicated worksheet for each academic module** (`POST-5101`, `PROD-5102`, `AUD-5103`, `PROD-5104`, `POST-5105`, `ENG-5100`).
  - Includes a top **Summary** worksheet detailing applied filters, export timestamp, module totals, and overall division attendance rate.
  - Excel-safe worksheet names (max 31 characters, prohibited characters sanitized).
  - Frozen header rows, color-coded status badges (Emerald Present, Rose Absent, Purple Cancelled), and auto-calculated column widths.
- **Timetable Synchronization:**
  - Auto-selects the current local day of week (e.g., Friday).
  - Lecture slot picker auto-populates module code, title, time range, and lecture type from the authoritative schedule.
  - Allows multiple distinct lecture modules to be marked on the same calendar day.

### 2.2 Student Workspace & Deliverable Submission
- Collaborative project workspace where students upload coursework, project files, and production plans.
- Supports external portfolio/drive links and direct file attachments.
- Storage limits: Images $\le$ 5MB, Documents $\le$ 10MB.
- Cloudflare R2 S3-compatible object storage with Supabase / local storage fallbacks.

### 2.3 Student Invitation Codes & Account Activation
- SuperAdmin issues secure, single-use, 7-day expiration invitation vouchers.
- Onboarding flow: Student navigates to "Activate Account", enters their official Student Index Number (e.g., `RT/TPOPT/26/01`), one-time invitation code, and sets their password.
- Batch representatives activate through the same flow using their student indexes, which automatically elevate their accounts to Representative privileges upon sign-in.

### 2.4 Division Community Chat
- Centralized announcements and academic communication for Batch 11.
- Synchronized timetable cancellation notices and module updates.
- SuperAdmin has one-click chat history wipe/purge capabilities.

---

## 3. Technology Stack

- **Framework:** Next.js 14.2 (App Router) + React 18
- **Language:** TypeScript 5.7
- **Styling:** Tailwind CSS 3.4
- **Database:** Supabase PostgreSQL + local persistence abstraction (`src/lib/db.ts`)
- **Cloud Storage:** Cloudflare R2 (AWS S3 Client `@aws-sdk/client-s3`)
- **Spreadsheet Engine:** ExcelJS (`exceljs`)
- **PDF Engine:** jsPDF + jsPDF-AutoTable
- **Authentication:** `jose` (JWT) + `bcryptjs` password hashing

---

## 4. Default Access Credentials

| Account Role | Username / Identity | Password | Clearances & Scope |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `ucrtvrepb11` | `TelevisionStudies#2026` | Full System Clearance, Invitation Vouchers, DB Backups, Chat Clear |
| **Batch Representatives** | Student Index (e.g. `RT/TPOPT/26/02`) | Set during Activation | Roll-call Attendance, Timetable Overrides, Rosters |
| **Enrolled Students** | Student Index (e.g. `RT/TPOPT/26/01`) | Set during Activation | View Own Attendance, Submit Workspace Tasks, Division Chat |

---

## 5. Environment Variables

Configure the following variables in `.env.local` (see `.env.example` for template):

```bash
# Application Server
PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=

# Supabase PostgreSQL Integration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_DOMAIN=
```

---

## 6. Development & Verification Commands

### Start Development Server
```powershell
npm run dev
```

### Build for Production
```powershell
npm run build
npm start
```

### Run Full Attendance & Integration Verification Suite (17 Tests)
```powershell
node scripts/verify_attendance_full_suite.js
```

---

## 7. Project Documentation Index

- `ATTENDANCE_DATABASE_DESIGN.md`: Relational schema, ERD, foreign keys, constraints, and Row Level Security policies.
- `ATTENDANCE_TEST_REPORT.md`: Comprehensive 17-point test matrix covering calculations, timetable mapping, and Excel module separation.
- `ATTENDANCE_IMPLEMENTATION_AUDIT.md`: Project audit and gap analysis.
- `UCR_Attendance_Updated_Module_Separated_Excel_README.md`: Original specification document.
