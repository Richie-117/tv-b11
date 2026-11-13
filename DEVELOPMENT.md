# UCR Portal 2.0 — Development & Cloud Setup Guide
**Division of Television Studies — University College of Rathmalana (Batch 11 — 2026 Intake)**  
**Document Version:** 2.2.0  
**Target Path:** `D:\UCR-Portal-New\DEVELOPMENT.md`

---

## 1. Overview & Dual Storage Architecture

UCR Portal 2.0 is built with a **resilient dual-mode database layer**:
1. **Local Mode (Default out-of-the-box)**: Operates seamlessly using `data/db.json` with in-memory caching and disk serialization. Zero external cloud dependencies are required to develop, mark attendance, generate institutional PDFs, or test student views locally.
2. **Cloud Mode (Production Supabase & R2)**: When you provide Supabase credentials in `.env.local`, the server connects directly to Supabase PostgreSQL with Row Level Security (RLS) enforcement and live sync.

---

## 2. Setting Up a New Supabase Project

> [!IMPORTANT]
> Never connect UCR Portal 2.0 to the old production database. Always create a clean, dedicated Supabase project.

### Step 2.1: Create Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set your project details:
   - **Name**: `ucr-tv-portal-v2`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select Southeast Asia (Singapore) for lowest latency to Sri Lanka.
4. Click **Create new project** and wait ~2 minutes for provisioning.

### Step 2.2: Apply Database Schema & Seed Data (One-Click)
We provide two ways to apply the schema:

#### Option A: Unified Master File (Recommended — 1 Step)
1. In your Supabase dashboard, navigate to **SQL Editor** in the left sidebar.
2. Open `supabase/complete_unified_schema_and_seed.sql` in your workspace.
3. Copy all lines and paste them into the Supabase SQL Editor.
4. Click **Run** (Ctrl+Enter).
5. All 13 tables, storage buckets (`student-submissions`, `chat-attachments`, `portal-backups`), RLS policies, 48 official students, 6 admins, and active invitation tokens are set up instantly.

#### Option B: Incremental Migrations
- `supabase/migrations/001_foundation_and_admin_core.sql`: Core tables, admins, attendance, timetables, assignments.
- `supabase/migrations/002_complete_system_with_storage_and_rls.sql`: Student activation, task submissions, Division Chat, storage buckets, RLS, and 48-student roster seed.

### Step 2.3: Retrieve Supabase API Keys
1. Go to **Project Settings** (gear icon) -> **API**.
2. Copy the following values into your `.env.local`:
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (secret) -> `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Setting Up Cloudflare R2 Storage (Media, Tasks & Backups)

Cloudflare R2 provides zero-egress fee S3-compatible cloud storage for student deliverables, Division Chat attachments, and portal disaster backups.

### Step 3.1: Create an R2 Bucket
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, select **R2** -> **Overview**.
3. Click **Create bucket**.
4. Name the bucket (e.g. `ucr-portal-assets`).
5. Click **Create Bucket**.

### Step 3.2: Generate S3 API Credentials
1. On the R2 Overview page, click **Manage R2 API Tokens** in the top right.
2. Click **Create API token**.
3. Configure the token:
   - **Token Name**: `ucr-portal-token`
   - **Permissions**: `Object Read & Write` (Admin Read & Write)
   - **Specify bucket**: Select your bucket `ucr-portal-assets`
4. Click **Create API Token**.
5. Copy the credentials into `.env.local`:
   - `R2_ACCOUNT_ID`: Displayed in Cloudflare dashboard URL.
   - `R2_ACCESS_KEY_ID`: String of letters/numbers.
   - `R2_SECRET_ACCESS_KEY`: 64-character secret.
   - `R2_ENDPOINT`: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `R2_BUCKET_NAME`: `ucr-portal-assets`

### Step 3.3: Configure Bucket CORS (Cross-Origin Resource Sharing)
In bucket **Settings** -> **CORS Policy**, add:
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.lk"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 4. Environment Variables Reference (`.env.local`)

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

```env
# 1. Server & Host Configuration
PORT=3000
HOSTNAME=0.0.0.0
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 2. JWT & Session Security
JWT_SECRET=ucr-television-studies-2026-jwt-secure-secret-key-32chars

# 3. Supabase Database & Realtime (PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# 4. Cloudflare R2 Storage (Optional, for S3 uploads)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=ucr-portal-assets
R2_ENDPOINT=https://your-cloudflare-account-id.r2.cloudflarestorage.com
```

---

## 5. Testing & Verification Checklist

### 5.1 Student Account Activation & Login
1. Open the portal at `http://localhost:3000/login`.
2. Notice the clean, neutral **Login / Activate** design with single "Sign In" button (no "Admin Login" text).
3. Switch to the **Activate Account** tab:
   - Enter Invitation Code: `UCR-2026-TPOPT-7721` (or `UCR-2026-TPRPT-9932`).
   - Enter Student Index Number: `RT/TPOPT/26/01`.
   - Set a secure new password and confirm it.
   - Click **Activate Student Account**.
4. The system validates the 30-day token, activates the student record, creates the 30-day authenticated session cookie, and directs the student straight to `/student`.

### 5.2 Student Profile Field Locking
1. As a logged-in student, navigate to `/student/profile`.
2. Observe the **Official Institutional Record (Locked)** box:
   - Full Name: `D.G. Dissanayaka` (Locked)
   - Student ID: `RT/TPOPT/26/01` (Locked)
   - Academic Programme: `TPOPT` (Locked)
3. Edit personal contact info (Phone, Email, Residential Address, Emergency Contact).
4. Save updates and verify they persist.

### 5.3 Live Timetable & Attendance Auto-Sync
1. Sign in as Admin (`ucrtvrepb11` / `hesan`).
2. Navigate to `/admin/attendance`.
3. Notice the **Live Timetable Lecture Sync** banner:
   - Reads the current Sri Lanka wall-clock time and weekday.
   - Auto-detects the matching module slot (e.g. `POST-5101` or `PROD-5102`).
   - Pre-selects the Academic Module automatically.
4. Mark attendance using quick thumb toggles (Present / Absent / Excused) or "Mark All Present".
5. Save the session:
   - Instant calculation of attendance rate.
   - Zero hardcoding: starts cleanly from 0% before the first session is marked.

### 5.4 Absentee Roster & Filter Testing
1. In `/admin/attendance`, switch to the **Absentee Roster** tab.
2. Select a Date Filter or Course Filter (`TPOPT` / `TPRPT`).
3. View the total absent count and instant student list with direct phone numbers for immediate batch representative follow-up.

### 5.5 Student Workspace Task Submission & Division Chat Mention
1. In `/student/workspace`, click **Submit Deliverable** on any active task.
2. Enter deliverable link (Google Drive / cloud link) or attach file.
3. Check the box **"Mention deliverable in Division Chat"**.
4. Click **Confirm & Submit Deliverable**.
5. Navigate to `/student/chat` (Division Chat) to see the submission notice posted with `#Task` tag.
6. Admins can moderate or clear chat history in `/admin/chat` using the **Clear Chat** modal.

### 5.6 Student Visual Attendance Calendar
1. Sign in as student and open `/student/attendance`.
2. Notice the **Interactive Monthly Attendance Calendar**:
   - Days with sessions are colored green (Present), red (Absent), or amber (Excused).
   - Tap any day to inspect the exact session details, time, module code, and remarks.

---

## 6. Preserved Admin & Test Accounts

| Account Role | Username | Initial Password | Notes / Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `ucrtvrepb11` | `TelevisionStudies#2026` | Full system clearance, chat clearing, disaster backups, invitations |
| **TPOPT Male Rep** | `hesan` | `RepHesan#2026` | P.A. Hesan Samudika (+94 78 897 8729) |
| **TPOPT Female Rep** | `tharushika` | `RepTharushika#2026` | P. Tharushika Nethmi (+94 77 952 0533) |
| **TPRPT Male Rep** | `rafidh` | `RepRafidh#2026` | M. Rafidh Rizwan (+94 76 372 6829) |
| **TPRPT Female Rep** | `yenuki` | `RepYenuki#2026` | Yenuki Ruhansa Atapattu (+94 71 215 4389) |
| **Student View Tester**| `student` | `Student#2026` | Pre-configured student test account (routes directly to `/student`) |

---

## 7. Build & Execution Commands

```bash
# Navigate to project
cd D:\UCR-Portal-New

# Start development server
npm run dev

# Run production build (39/39 routes validated)
npm run build

# Start production server
npm start
```
