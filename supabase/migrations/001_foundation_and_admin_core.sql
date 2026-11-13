-- ==============================================================================
-- University College of Rathmalana (UCR) - Division of Television Studies
-- New Portal Schema Migration 001: Foundation, Admins, Attendance & Core Entities
-- ==============================================================================

-- 1. Admins & Roles Table
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'representative' CHECK (role IN ('superadmin', 'representative', 'student')),
    representative_course TEXT CHECK (representative_course IN ('TPOPT', 'TPRPT')),
    representative_role TEXT, -- 'Male Representative' | 'Female Representative'
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON public.admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);

-- 2. Student Labels Table
CREATE TABLE IF NOT EXISTS public.student_labels (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF7900',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default practical labels
INSERT INTO public.student_labels (id, name, color, description)
VALUES 
    ('label-rep', 'Batch Representative', '#FF7900', 'Appointed batch student leader'),
    ('label-followup', 'Needs Follow-up', '#EF4444', 'Requires academic or attendance consultation'),
    ('label-doc-pending', 'Document Pending', '#F59E0B', 'Pending submission of enrollment documents'),
    ('label-honor', 'Distinction / Honors', '#10B981', 'Outstanding academic or practical performance')
ON CONFLICT (id) DO NOTHING;

-- 3. Students Table (with privacy segregation)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    student_number TEXT UNIQUE NOT NULL,
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT')),
    batch TEXT NOT NULL DEFAULT 'Batch 11 — 2026',
    gender TEXT CHECK (gender IN ('Male', 'Female')),
    is_representative BOOLEAN NOT NULL DEFAULT FALSE,
    representative_role TEXT,
    phone_number TEXT,
    email TEXT,
    residential_address TEXT,
    parent_guardian_name TEXT,
    parent_guardian_phone TEXT,
    emergency_contact TEXT,
    profile_image_url TEXT,
    labels TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_course ON public.students(course);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON public.students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_representative ON public.students(is_representative);

-- 4. Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT', 'ALL')),
    module_id TEXT NOT NULL,
    module_code TEXT,
    module_title TEXT NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'lecture' CHECK (session_type IN ('lecture', 'practical', 'workshop', 'other')),
    start_time TEXT,
    end_time TEXT,
    total_students INTEGER NOT NULL DEFAULT 0,
    present_count INTEGER NOT NULL DEFAULT 0,
    absent_count INTEGER NOT NULL DEFAULT 0,
    marked_by_admin_id TEXT REFERENCES public.admins(id) ON DELETE SET NULL,
    marked_by_admin_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON public.attendance_sessions(course);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_module ON public.attendance_sessions(module_id);

-- 5. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_number TEXT NOT NULL,
    student_name TEXT NOT NULL,
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT')),
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused')),
    remarks TEXT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_admin_id TEXT REFERENCES public.admins(id) ON DELETE SET NULL,
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- 6. Timetables & Overrides Tables
CREATE TABLE IF NOT EXISTS public.timetables (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('foundation', 'academic_1', 'academic_2')),
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT')),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    batch_label TEXT NOT NULL,
    pdf_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_overrides (
    id TEXT PRIMARY KEY,
    timetable_id TEXT REFERENCES public.timetables(id) ON DELETE CASCADE,
    timetable_slot_id TEXT,
    course TEXT CHECK (course IN ('TPOPT', 'TPRPT')),
    exception_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('POSTPONED', 'UNAVAILABLE')),
    reason TEXT,
    rescheduled_date TEXT,
    rescheduled_start_time TEXT,
    rescheduled_end_time TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_overrides_date ON public.timetable_overrides(exception_date);
CREATE INDEX IF NOT EXISTS idx_overrides_course ON public.timetable_overrides(course);
CREATE INDEX IF NOT EXISTS idx_overrides_active ON public.timetable_overrides(is_active);

-- 7. Assignment Schedules Table
CREATE TABLE IF NOT EXISTS public.assignment_schedules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    course TEXT NOT NULL CHECK (course IN ('ALL', 'TPOPT', 'TPRPT')),
    module_id TEXT,
    module_title TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'postponed', 'completed', 'cancelled')),
    external_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by_admin_id TEXT REFERENCES public.admins(id) ON DELETE SET NULL,
    created_by_admin_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignment_schedules(course);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON public.assignment_schedules(deadline);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignment_schedules(status);

-- 8. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
    admin_name TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);

-- 9. User Preferences Table (Persists mobile navbar tab customizations)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id TEXT PRIMARY KEY,
    mobile_visible_tabs TEXT[] NOT NULL DEFAULT ARRAY['dashboard', 'students', 'attendance', 'timetable', 'tools'],
    theme TEXT NOT NULL DEFAULT 'dark',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Timetable is viewable publicly (published only)
DROP POLICY IF EXISTS "Public can view published timetables" ON public.timetables;
CREATE POLICY "Public can view published timetables" ON public.timetables
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Public can view active timetable overrides" ON public.timetable_overrides;
CREATE POLICY "Public can view active timetable overrides" ON public.timetable_overrides
    FOR SELECT USING (is_active = true);

-- Service-role full access for trusted server APIs
DROP POLICY IF EXISTS "Service role full access to admins" ON public.admins;
CREATE POLICY "Service role full access to admins" ON public.admins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to student_labels" ON public.student_labels;
CREATE POLICY "Service role full access to student_labels" ON public.student_labels FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to students" ON public.students;
CREATE POLICY "Service role full access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to attendance_sessions" ON public.attendance_sessions;
CREATE POLICY "Service role full access to attendance_sessions" ON public.attendance_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to attendance_records" ON public.attendance_records;
CREATE POLICY "Service role full access to attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to timetables" ON public.timetables;
CREATE POLICY "Service role full access to timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to timetable_overrides" ON public.timetable_overrides;
CREATE POLICY "Service role full access to timetable_overrides" ON public.timetable_overrides FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to assignment_schedules" ON public.assignment_schedules;
CREATE POLICY "Service role full access to assignment_schedules" ON public.assignment_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Service role full access to admin_audit_logs" ON public.admin_audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to user_preferences" ON public.user_preferences;
CREATE POLICY "Service role full access to user_preferences" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);
