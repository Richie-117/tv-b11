# UCR Portal 2.0 — Division of Television Studies
**University College of Rathmalana (Affiliated with University of Vocational Technology - UoVT)**  
**Batch 11 — 2026 Intake Official Mobile-First Administration & Student Portal**

---

## 1. Overview & Architecture

UCR Portal 2.0 is the official academic and administrative management platform engineered specifically for the **Division of Television Studies** at the University College of Rathmalana.

- **Theme & Identity**: High-contrast, accessibility-tested dark midnight theme (`#0A0E17` canvas, `#111827` panels, `#0088FF` UoVT cyan-blue, `#FF7900` UCR orange).
- **Mobile First**: Optimized for smartphones, tablets, and desktop workstations with zero horizontal overflow and 48px minimum touch targets.
- **Fail-Safe Database**: Integrated Supabase PostgreSQL with local atomic JSON database mirror and an automated Circuit Breaker ensuring 0ms failover during network pauses.
- **Cloud Storage**: Cloudflare R2 bucket integration for private file storage, student deliverables, and disaster recovery database backups.

---

## 2. Core Modules & Production Capabilities

### 2.1 Live Lecture Student Check-In & Roll-Call Flow
- **Admin/Representative Push Check-In**:
  - In `/admin/attendance` under the **Mark Live Session** tab, the representative or lecturer selects an available lecture from the authoritative timetable of that day (or standard module).
  - Tapping **"Push to Check-In"** opens a live broadcast window for that lecture and cohort.
- **Student Dashboard Experience**:
  - In `/student` (Overview), students in the active cohort see a prominent card displaying the **Lecture Module Name** and a single **"Check-In"** button.
  - Upon tapping **"Check-In"**, the button **disappears immediately**, replaced by a clean confirmation: `✓ Checked In · Present`.
- **Instant Attendance Synchronization**:
  - The student's status automatically turns to `Present` in the Admin's live roster with a `📱 Checked In` badge.
  - The lecturer or representative can manually adjust any student's status (toggle Present / Absent / Excused) or mark all.
  - Tapping **"Save Session"** permanently records attendance: all checked-in or marked students are saved as **Present**, unmarked students are saved as **Absent**, and the check-in window automatically closes.

### 2.2 Attendance Tracking & Calculations
- **Official Formula (`src/lib/attendanceCalculations.ts`)**:
  $$\text{Attendance Rate} = \frac{\text{Present Valid Sessions}}{\text{Present Valid Sessions} + \text{Absent Valid Sessions}} \times 100$$
  - Official tracking begins on **16 November 2026** (`Asia/Colombo`).
  - Cancelled, postponed, and non-held sessions are excluded from calculations.
  - Zero-denominator state displays `"No attendance data"` instead of a misleading `0%`.

### 2.3 Document & Export Engines
- **Module-Separated Excel Engine (`src/lib/excelExport.ts` via `exceljs`)**:
  - Generates multi-sheet workbooks with dedicated worksheets for each academic module (`ICT`, `English`, `DM7`, `DM10`, etc.) plus a comprehensive Summary sheet.
- **PDF Document Generator (`src/lib/pdfGenerator.ts` via `jspdf`)**:
  - A4 optimized printing with custom column add-ons (Phone, ID, Signature, Custom notes).
  - "Batch" column excluded (Batch 11 is permanently rendered in the header subtitle).

### 2.4 Student Workspace & Deliverable Submission
- Students upload coursework, production briefs, and assignments.
- Server-side file ceilings: **Images $\le$ 5MB**, **Documents $\le$ 10MB**.
- Files stream to Cloudflare R2 with secure signed access.

### 2.5 Single-Use Invitation Vouchers & Account Activation
- SuperAdmin issues secure 7-day single-use voucher codes.
- Students and Representatives register via **Activate Account** at `/login` using their Student Index Number (e.g. `RT/TPOPT/26/01`) and invitation voucher.
- Representatives are appointed from student records (`isRepresentative: true`), granting them administrative roll-call powers for their cohort.

### 2.6 Division Chat & Moderation
- Centralized division announcements and student coordination.
- SuperAdmin one-click chat purge capability (`DELETE /api/chat`) with audit logging.

### 2.7 Cloudflare R2 Backups & Disaster Recovery
- Full database JSON exports with single-click R2 upload.
- Verified restore capability for isolated recovery testing.

---

## 3. Technology Stack

- **Framework**: Next.js 14.2 (App Router) + React 18
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Database**: Supabase PostgreSQL 15 + Atomic Local Database Mirror
- **Cloud Storage**: Cloudflare R2 (`@aws-sdk/client-s3`)
- **Document Engines**: `exceljs` + `jspdf` / `jspdf-autotable`
- **Authentication**: `jose` (JWT) + `bcryptjs` password hashing

---

## 4. Local Development Setup

### 4.1 Prerequisites
- Node.js 18.17+ or 20 LTS
- npm or pnpm

### 4.2 Installation
```bash
git clone https://github.com/Richie-117/tv-b11.git
cd tv-b11
npm install
```

### 4.3 Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the placeholders with your Supabase, Cloudflare R2, and JWT secret keys.

### 4.4 Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Build, Lint & Test Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Launch local Next.js development server on port 3000 |
| `npm run build` | Compile optimized production build (42/42 routes) |
| `npm run start` | Start production server (binds to `process.env.PORT`) |
| `npm run lint` | Run Next.js ESLint checks |
| `npx tsc --noEmit` | Strict TypeScript type validation |
| `node scripts/verify_checkin_and_r2_suite.js` | Run automated end-to-end verification suite |

---

## 6. Render Deployment Guide

1. **Create Web Service**:
   - In Render Dashboard, click **New +** -> **Web Service**.
   - Connect your GitHub repository.
2. **Build & Start Commands**:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. **Environment Variables**:
   - Set the variables listed in `.env.example` in Render's **Environment** tab.
   - Do NOT commit `.env.local` to git.
4. **Health Check Path**:
   - Set Health Check Path to `/api/health`.

---

## 7. Institutional Role Structure

| Role | Username / Identity | Access & Permissions |
| :--- | :--- | :--- |
| **SuperAdmin** | `ucrtvrepb11` / `ucrtvadmin` | Full Division Access: System Admin, Invitations, Backups, Chat Purge |
| **Representative (TPOPT / TPRPT)** | Student Index (Activated) | Cohort Attendance, Check-In Broadcast, Timetables, PDF Rosters |
| **Student** | Student Index (Activated) | 1-Tap Check-In, Own Attendance History, Workspace Deliverables, Division Chat |

---

## 8. Production Verification & Quality Assurance

- **Route Compilation**: 42/42 static and dynamic routes compiled and optimized via `next build`.
- **Type Safety**: 0 TypeScript errors verified with `npx tsc --noEmit`.
- **Security & RBAC**: Strict role boundaries between Student, Representative, and SuperAdmin enforced server-side.
- **Environment Configuration**: Safe template provided in `.env.example`.
- **Git Hygiene**: Local credentials and database backups strictly ignored via `.gitignore`.
