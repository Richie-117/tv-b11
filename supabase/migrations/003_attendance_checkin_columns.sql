-- ==============================================================================
-- Migration 003: Add Attendance Check-in Support & Columns
-- ==============================================================================

-- 1. Add checkin columns to attendance_sessions
ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS checkin_status TEXT NOT NULL DEFAULT 'closed' 
CHECK (checkin_status IN ('active', 'closed', 'expired'));

ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS checkin_opened_at TIMESTAMPTZ;

ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS checkin_expires_at TIMESTAMPTZ;

ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS session_status TEXT NOT NULL DEFAULT 'held' 
CHECK (session_status IN ('held', 'cancelled', 'postponed'));

-- 2. Create attendance_checkins table for self-service student roll call
CREATE TABLE IF NOT EXISTS public.attendance_checkins (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_number TEXT NOT NULL,
    student_name TEXT NOT NULL,
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT', 'ALL')),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'confirmed', 'withdrawn')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    confirmed_by_admin_id TEXT REFERENCES public.admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_checkins_session ON public.attendance_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkins_student ON public.attendance_checkins(student_id);

-- 3. Enable RLS and Service Role Full Access
ALTER TABLE public.attendance_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to attendance_checkins" ON public.attendance_checkins;
CREATE POLICY "Service role full access to attendance_checkins" 
ON public.attendance_checkins FOR ALL USING (true) WITH CHECK (true);

