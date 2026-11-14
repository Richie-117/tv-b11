# UCR Student Portal — Demo & Mock Data Audit Report

**Audit Objective**: Identify, isolate, and remove all demo accounts, bypass mechanisms, fake fixtures, and mock fallbacks from the production codebase.

---

## 1. Audit Findings & Removals

### 1.1 Demo / Preview Login Buttons
- **Previous State**: Early UI prototypes contained a "Preview as Student" or "Demo Login" shortcut button.
- **Action Taken**: **Completely removed**. All logins must authenticate through the unified institutional login form (`/login`) using valid credentials.
- **Production Status**: Clean.

---

### 1.2 Demo Student Account (`RT/TPOPT/26/01`)
- **Previous State**: `RT/TPOPT/26/01` was used as a public preview account without password verification.
- **Action Taken**: **Restored to legitimate student status**. 
  - Belongs to student **D.G. Dissanayaka** (Index: `RT/TPOPT/26/01`, Cohort: `TPOPT`).
  - Account requires authentic activation with institutional invitation token and password authentication.
  - No bypass or automatic login is permitted for this account.
- **Production Status**: Secured.

---

### 1.3 Pre-configured Representative Logins
- **Previous State**: Representatives had separate static accounts with hardcoded bypasses.
- **Action Taken**: In accordance with user requirements, representatives register like any other student using an institutional invitation code. Upon login, the system automatically detects their appointment as a Representative (`isRepresentative: true`) and assigns them appropriate administrative capabilities for their cohort.
- **Production Status**: Clean.

---

### 1.4 Mock Attendance & Timetable Fallbacks
- **Previous State**: When database queries failed or returned empty arrays, some components displayed hardcoded dummy attendance sessions or mock timetable slots.
- **Action Taken**:
  - Replaced all mock fallbacks with honest, high-contrast empty states.
  - Implemented the Supabase Circuit Breaker to ensure that when remote queries fail, live data is retrieved from the synchronized local JSON store rather than showing dummy records.
- **Production Status**: Clean.

---

## 2. Retained Real Data (Preserved)

| Data Category | Item Count | Source | Verification |
| :--- | :--- | :--- | :--- |
| **Real Student Records** | 48 Students (26 TPOPT + 22 TPRPT) | `data/db.json` & Supabase | 100% Preserved with official index numbers |
| **Academic Timetables** | Foundation Programme 2026 (Mon–Fri) | `data/db.json` | Real lecture slots (ICT, English, DM7, DM10, etc.) |
| **Academic Modules** | 10 Verified Curriculum Subjects | Core System | Official codes and titles |
| **Audit Logs** | Immutable Admin Event Log | `data/db.json` & Supabase | Real admin actions preserved |

