# UCR Student Portal — Security Audit & Hardening Report

**Audit Date**: November 2026  
**Scope**: Frontend, API Routes, Database Access, Object Storage, Session Management, and Infrastructure.

---

## 1. Vulnerability Findings & Verified Remediations

### Finding 1: Unprotected Student & Admin Routes (IDOR / Auth Bypass)
- **Severity**: **Critical (CVSS 9.1)**
- **Affected Area**: `/student/*`, `/admin/*`, and API endpoints under `/api/admin/*` and `/api/student/*`.
- **Root Cause**: Earlier prototypes permitted unauthenticated client-side navigation or fallback mock previews.
- **Fix Applied**: 
  - Strict middleware (`src/middleware.ts`) and server-side token validation (`src/lib/auth.ts`) now intercept every request.
  - Invalid or missing sessions are immediately rejected with HTTP 401/403 or redirected to `/login`.
  - Representative actions are strictly scoped to their assigned cohort (`TPOPT` or `TPRPT`).
  - SuperAdmin actions (user management, database backups, chat purge) require explicit `superadmin` role or granular permissions.
- **Verification**: Verified via automated HTTP tests; unauthenticated GET/POST requests receive 401 Unauthorized.

---

### Finding 2: Exposure of Credentials in Version Control & Examples
- **Severity**: **High (CVSS 8.2)**
- **Affected Area**: `.env.example`, `.gitignore`, and Git history.
- **Root Cause**: `.env.example` previously contained real API credentials and production URLs.
- **Fix Applied**:
  - Sanitized `.env.example` completely; replaced all credentials with safe placeholders.
  - Updated `.gitignore` to explicitly ignore `.env*`, `data/backups/`, `*.dump`, and private database dumps.
- **Verification**: Git status inspection confirms zero tracked environment files or database dumps.

---

### Finding 3: Arbitrary File Upload & Quota Exhaustion in Storage Endpoints
- **Severity**: **High (CVSS 7.8)**
- **Affected Area**: `src/app/api/student/avatar/route.ts` and `src/app/api/student/workspace/upload/route.ts`.
- **Root Cause**: Unlimited file size uploads could exhaust storage limits and introduce malicious binaries.
- **Fix Applied**:
  - Enforced strict server-side MIME-type validation (JPEG, PNG, WEBP, PDF, DOCX, ZIP).
  - Enforced strict file size ceilings:
    - **Images / Profile Photos**: Maximum **5 MB**
    - **Documents / Project Deliverables**: Maximum **10 MB**
  - Stored files using randomized, collision-resistant object keys rather than client-supplied paths.
- **Verification**: Tested buffer sizes; uploads exceeding 5MB for images or 10MB for documents return HTTP 400.

---

### Finding 4: Insecure Attendance Check-in Manipulation
- **Severity**: **Medium (CVSS 6.5)**
- **Affected Area**: `src/app/api/student/checkin/route.ts`
- **Root Cause**: Potential for students to submit check-ins for sessions that are closed, expired, or belong to another cohort.
- **Fix Applied**:
  - The server verifies session active status, expiry timestamp (`checkinExpiresAt`), and cohort boundaries server-side.
  - Check-in submissions cannot be spoofed by modifying client parameters.
- **Verification**: Verified via test suite; only authenticated students of the active cohort within the open window can check in.

---

### Finding 5: Cloudflare R2 & Supabase Secret Protection
- **Severity**: **High (CVSS 8.0)**
- **Affected Area**: AWS S3 SDK & Supabase Client configuration.
- **Root Cause**: Risk of client-side leakage of `R2_SECRET_ACCESS_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
- **Fix Applied**:
  - Credentials remain strictly server-side in Node.js runtime (`src/lib/storage.ts` and `src/lib/supabase.ts`).
  - No private keys are prefixed with `NEXT_PUBLIC_`.
- **Verification**: Inspected client JS bundles; zero AWS or Supabase service keys are included in browser payloads.

---

## 2. Security Configuration Summary

| Layer | Control | Status |
| :--- | :--- | :--- |
| **Transport** | HTTPS, TLS 1.3 | Enforced by Render / Cloudflare |
| **Authentication** | HttpOnly, Secure, SameSite=Lax JWT Cookie | Active (`ucr_session_token`) |
| **Passwords** | Bcrypt (Salt rounds = 10) | Active |
| **Authorization** | Server-side RBAC (SuperAdmin, Rep, Student) | Active |
| **Storage Security** | S3 Private Bucket + Authenticated Proxy | Active |
| **Audit Logging** | In-database immutable audit log (`recordAdminAuditLog`) | Active |
