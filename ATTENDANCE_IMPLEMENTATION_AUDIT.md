# UCR Student Portal — Attendance Implementation Audit
**Document Date:** November 13, 2026  
**Auditor:** Antigravity AI Engineer  
**Scope:** Architecture inspection, database schema, timetable mapping, role authorization, and Excel/PDF report capabilities.

---

## 1. Project Overview & Existing File Structure

| Component | Path | Purpose | Current State |
| :--- | :--- | :--- | :--- |
| **Admin Attendance UI** | `src/app/admin/attendance/page.tsx` | Live roll-call, session creation, absentee filtering, module syncing | Active. Supports multi-student marking and timetable slot sync. |
| **Student Attendance UI** | `src/app/student/attendance/page.tsx` | Mobile-first monthly calendar visualizer, stats, session detail tap | Active. Renders monthly calendar grid and session popups. |
| **Admin Attendance API** | `src/app/api/admin/attendance/route.ts` | Session queries, roll-call persistence, absentee rosters | Active. Requires permission `attendance:read` / `attendance:write`. |
| **Student Attendance API** | `src/app/api/student/attendance/route.ts` | Student-filtered attendance records and monthly calendar marks | Active. Restricts data to authenticated student. |
| **Timetable API** | `src/app/api/admin/timetable/route.ts` | Weekly timetable definitions, current day status, overrides | Active. Authoritative schedule source. |
| **Storage & Object Store** | `src/lib/storage.ts` | Cloudflare R2 / Supabase Storage / Local fallback | Active. Configured with `@aws-sdk/client-s3`. |
| **Student Invitations** | `src/app/admin/invitations/page.tsx` | Individual & bulk student invitation voucher generator | Active. Generates tokens with 7-day validity. |
| **Authentication & RBAC** | `src/lib/auth.ts`, `src/app/api/auth/*` | Unified login, student index activation, SuperAdmin / Rep RBAC | Active. SuperAdmin & Representative elevation operational. |

---

## 2. Timetable Source & Authoritative Mapping

### 2.1 Schedule Architecture
The weekly schedule for Batch 11 (2026 Foundation) is defined across two programmes:
- **TPOPT** (Television & Digital Media Post Production Technology — 26 Students)
- **TPRPT** (Television Studio Production Technology — 22 Students)

Timetable data provides structured class slots with contiguous periods:
- `08:30 – 10:30`: Morning Lecture / Theory
- `10:40 – 12:40`: Midday Technical / Lab Lecture
- `13:20 – 15:20`: Afternoon Studio / Practical Session
- `15:30 – 16:30`: Late Practical / Review

### 2.2 Academic Module Catalogue
1. **POST-5101**: Non-Linear Video Editing & Workflow Systems
2. **PROD-5102**: Multi-Camera Television Studio Production
3. **AUD-5103**: Digital Audio Post-Production & Sound Design
4. **PROD-5104**: Cinematic Lighting Design & Camera Optics
5. **POST-5105**: Color Grading & Digital Intermediate Mastering
6. **ENG-5100**: Broadcast Media Technology & Transmission Basics

---

## 3. Academic Stages & Date Boundaries

- **Academic Programme Inception:** 25 October 2026 (Foundation Stage commencement).
- **Official Portal Attendance Tracking Inception:** **16 November 2026** (`2026-11-16`).
- **Date Rule Enforcement:**
  - Any session recorded prior to 16 November 2026 must be strictly excluded from absence calculations and denominator counts.
  - Future stages (**Level 5** and **Level 6**) are defined as upcoming; their modules and schedules will be activated only upon official confirmation.

---

## 4. Identified Gaps & Required Upgrades

1. **Shared Calculation Standard:**
   - Centralize attendance percentage calculation in a standalone utility (`src/lib/attendanceCalculations.ts`) to ensure identical results across Student Calendar, Admin Dashboard, PDF Reports, and Excel Exports.
   - Enforce rule: `Attendance Rate = Present / (Present + Absent) * 100`. Exclude cancelled/postponed sessions and zero-denominator states.
2. **Excel Multi-Worksheet Export:**
   - Create a dedicated Excel export engine using `exceljs` that partitions attendance by lecture module into separate tabs (e.g. `POST-5101`, `PROD-5102`, etc.) plus an overarching `Summary` worksheet.
3. **Student Mode Hardening:**
   - Ensure students can never query other students' attendance by passing query parameters; enforce strict session identity server-side.
4. **Lecture Override Handling:**
   - Ensure cancelled or postponed sessions are properly labeled and excluded from denominator counts.
5. **Student Invitation Code Management:**
   - Provide copy, regenerate, revoke, and status filtering (Used, Unused, Expired, Revoked).

