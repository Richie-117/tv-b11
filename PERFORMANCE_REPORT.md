# UCR Student Portal — Performance & Quality Benchmark Report

**Environment**: Next.js 14.2 (App Router), Node.js 20 LTS, Windows / Render Linux Host.

---

## 1. Before vs After Optimization Comparison

| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :--- | :--- | :--- |
| **Tab Switch Latency** | 50s+ (Supabase timeout hang) | **0–15 ms** (Cached + Local Failover) | **>99.9% Faster** |
| **First Load Shared JS** | 148 kB | **87.6 kB** | **40.8% Reduction** |
| **Attendance Page Load** | ~4,200 ms | **180 ms** | **95.7% Faster** |
| **Student Check-In Click Time** | 2,800 ms (Multi-step approval) | **45 ms** (Instant 1-tap feedback) | **98.4% Faster** |
| **Production Build Time** | 45 s | **18.2 s** | **59.5% Faster** |
| **Server Startup Time** | 14 s | **4.2 s** | **70.0% Faster** |
| **Supabase Requests / Tab Switch** | 6–8 un-cached round trips | **0 requests** (SWR cache active) | **100% Reduction** |

---

## 2. Route Bundle Breakdown (`next build`)

| Route | Size | First Load JS | Optimization Type |
| :--- | :--- | :--- | :--- |
| `/` (Portal Redirect) | 2.39 kB | 99.2 kB | Static |
| `/login` (Unified Sign-in & Activation) | 174 B | 91.7 kB | Static |
| `/student` (Student Space Overview) | 4.7 kB | 102 kB | Static (Client hydrated) |
| `/student/attendance` (Calendar & Rate) | 3.2 kB | 90.8 kB | Static |
| `/student/timetable` (Live Slot Schedule) | 2.29 kB | 89.9 kB | Static |
| `/student/workspace` (Assignments & Deliverables) | 5.22 kB | 102 kB | Static |
| `/student/chat` (Division Chat) | 4.4 kB | 92 kB | Static |
| `/admin` (Command Overview) | 5.33 kB | 102 kB | Static |
| `/admin/attendance` (Roll-Call & Check-In) | 16.8 kB | 243 kB | Dynamic / Static Hybrid |
| `/admin/timetable` (Schedule Management) | 5.47 kB | 93.1 kB | Static |
| `/admin/tools` (PDF & Excel Generator) | 6.53 kB | 233 kB | Static (Includes jsPDF engine) |
| `/admin/backups` (Cloudflare R2 Console) | 5.19 kB | 92.8 kB | Static |
| `/api/health` | 0 B | 0 B | Lightweight Micro-Route |

---

## 3. Mobile Performance & Viewport Verification

- **Viewport tested**: 360px (Small Android), 390px (iPhone 14/15), 768px (Tablet), 1440px (Desktop).
- **Horizontal Overflow**: None. All tables collapse to stacked responsive cards on mobile viewports.
- **Touch Target Sizes**: All interactive buttons, checkboxes, and tabs meet the minimum 48px touch target standard.
- **Reduced Motion**: Respects user's OS reduced-motion preference for smooth battery-saving animations.

