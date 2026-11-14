# UCR Student Portal — Free-Tier Optimization Strategy

**Objective**: Maximize efficiency, reliability, and speed across Supabase, Cloudflare R2, and Render free tiers, preventing quota exhaustion, bandwidth charges, and performance degradation.

---

## 1. Verified Services & Free-Tier Plan Limits

| Service | Plan | Official Free Quota Limits | Verified Optimization in Portal |
| :--- | :--- | :--- | :--- |
| **Supabase** | Free Tier | 500 MB DB size<br>2 GB bandwidth/month<br>50,000 monthly active users<br>500K Edge invocations | Circuit breaker prevents request storms; cached lookups prevent repeated full-table queries; local database mirror offloads reads. |
| **Cloudflare R2** | Free Tier | 10 GB storage<br>1,000,000 Class A ops/month<br>10,000,000 Class B ops/month<br>**Zero egress fees** | File size limits: 5MB for photos, 10MB for documents. Backups and deliverables stream directly without redundant copies. |
| **Render** | Free Web Service | 512 MB RAM<br>0.1 CPU<br>750 hours/month<br>Spins down after 15 min inactivity | Lightweight `/api/health` endpoint; fast startup (Next.js standalone build); tab caching reduces cold restart delays. |

---

## 2. Request & Latency Reductions Implemented

### 2.1 Supabase Request Storm Prevention
- **Issue**: Initial prototype queried Supabase on every tab switch and keystroke, quickly burning through the monthly bandwidth and API quota.
- **Optimization**:
  - Implemented client-side stale-while-revalidate caching (`src/lib/portalCache.ts`).
  - Student and admin views re-use cached data for 10–30 seconds, refreshing in the background only when necessary.
  - Roll-call check-in polling is scoped strictly to the active session and interval is throttled to 3–5 seconds only while the marking screen is active.

### 2.2 Circuit Breaker & Failover Mechanism
- **Implementation**: `src/lib/supabase.ts` contains a 1.5-second timeout circuit breaker.
- **Benefit**: If remote Supabase experiences network congestion or quota pausing, requests immediately fail over to the local atomic store (`data/db.json`) in 0ms, preventing the 50-second browser hang reported during tab switching.

---

## 3. Storage & Bandwidth Optimization (Cloudflare R2)

1. **Server-Side File Ceilings**:
   - Profile images: Capped at **5 MB**.
   - Student project deliverables / assignments: Capped at **10 MB**.
2. **Deterministic & De-duplicated Object Keys**:
   - Avatars are stored under `avatars/{studentId}-{timestamp}.{ext}`.
   - Deliverables are stored under `deliverables/{taskId}/{studentId}-{fileName}`.
3. **Disaster Recovery Backups**:
   - Backups are compressed JSON archives stored in `backups/db-backup-{timestamp}.json`.
   - Metadata is verified with ETags, avoiding repeated complete file downloads.

---

## 4. Upgrade Triggers & Monitoring

| Service | Current Free Usage (Est.) | Upgrade Trigger (Action Required) |
| :--- | :--- | :--- |
| **Supabase** | < 15 MB DB size (< 3%) | If total historical attendance exceeds 500,000 records, archive old terms or upgrade to Pro ($25/mo). |
| **Cloudflare R2** | < 150 MB storage (< 2%) | If cumulative student video/project submissions exceed 10 GB, purchase additional storage at $0.015/GB/mo. |
| **Render** | 0.1 CPU, ~140 MB RAM | If cold starts become undesirable during peak morning roll-call, upgrade web service to Starter ($7/mo) to disable sleep. |

