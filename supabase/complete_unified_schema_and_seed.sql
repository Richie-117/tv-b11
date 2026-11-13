-- ==============================================================================
-- UNIVERSITY COLLEGE OF RATHMALANA (UCR) - DIVISION OF TELEVISION STUDIES
-- COMPLETE UNIFIED DATABASE SCHEMA, STORAGE BUCKETS, RLS POLICIES & SEED DATA
-- Target: Supabase PostgreSQL (Batch 11 — 2026 Intake)
-- ==============================================================================

-- PART 1: FOUNDATION AND CORE TABLES
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


-- PART 2: STUDENT ACTIVATION, SUBMISSIONS, CHAT & STORAGE
-- ==============================================================================
-- University College of Rathmalana (UCR) - Division of Television Studies
-- Migration 002: Student Activation, Submissions, Chat, Storage Buckets & RLS
-- ==============================================================================

-- 1. Extend students table for activation & credentials
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 2. Update admins table check constraint to support student test accounts
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE public.admins ADD CONSTRAINT admins_role_check CHECK (role IN ('superadmin', 'representative', 'student'));

-- 3. Student Invitations Table (7-day single use & intake voucher auth)
ALTER TABLE IF EXISTS public.student_invitations ALTER COLUMN token DROP NOT NULL;
ALTER TABLE IF EXISTS public.student_invitations ADD COLUMN IF NOT EXISTS code TEXT;
DROP TABLE IF EXISTS public.student_invitations CASCADE;
CREATE TABLE public.student_invitations (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL DEFAULT '',
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    student_number TEXT,
    student_name TEXT,
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT')),
    role TEXT NOT NULL DEFAULT 'student',
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by_student_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_invitations_code ON public.student_invitations(code);
CREATE INDEX IF NOT EXISTS idx_student_invitations_token ON public.student_invitations(token);
CREATE INDEX IF NOT EXISTS idx_student_invitations_student ON public.student_invitations(student_id);

-- 4. Task Submissions & Uploads Table
DROP TABLE IF EXISTS public.task_submissions CASCADE;
CREATE TABLE public.task_submissions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    task_title TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_number TEXT NOT NULL,
    student_name TEXT NOT NULL,
    course TEXT NOT NULL CHECK (course IN ('TPOPT', 'TPRPT')),
    remarks TEXT,
    submission_url TEXT,
    file_name TEXT,
    file_size TEXT,
    mentioned_in_chat BOOLEAN NOT NULL DEFAULT FALSE,
    grade TEXT,
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_student ON public.task_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_course ON public.task_submissions(course);

-- 5. Division Community Chat Messages Table
DROP TABLE IF EXISTS public.chat_messages CASCADE;
CREATE TABLE public.chat_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'Student',
    sender_avatar TEXT,
    course TEXT,
    text TEXT NOT NULL,
    attachment JSONB,
    task_mention JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);

-- 6. Enable Row Level Security (RLS) on newly created tables
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Public can read active invitations" ON public.student_invitations;
CREATE POLICY "Public can read active invitations" ON public.student_invitations
    FOR SELECT USING (is_used = false AND expires_at > NOW());

DROP POLICY IF EXISTS "Public and students can insert/read chat messages" ON public.chat_messages;
CREATE POLICY "Public and students can insert/read chat messages" ON public.chat_messages
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and students can submit tasks" ON public.task_submissions;
CREATE POLICY "Public and students can submit tasks" ON public.task_submissions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to student_invitations" ON public.student_invitations;
CREATE POLICY "Service role full access to student_invitations" ON public.student_invitations
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Storage Buckets (Task Deliverables, Chat Attachments, Backups)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('student-submissions', 'student-submissions', true),
    ('chat-attachments', 'chat-attachments', true),
    ('portal-backups', 'portal-backups', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage Objects Security Policies
DROP POLICY IF EXISTS "Public read access for task submissions" ON storage.objects;
CREATE POLICY "Public read access for task submissions" ON storage.objects
    FOR SELECT USING (bucket_id = 'student-submissions');

DROP POLICY IF EXISTS "Public upload access for task submissions" ON storage.objects;
CREATE POLICY "Public upload access for task submissions" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'student-submissions');

DROP POLICY IF EXISTS "Public read access for chat attachments" ON storage.objects;
CREATE POLICY "Public read access for chat attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Public upload access for chat attachments" ON storage.objects;
CREATE POLICY "Public upload access for chat attachments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');

-- ==============================================================================
-- Institutional Seed Data: Admins, Students (48), Timetables, Invitations
-- ==============================================================================

-- Seed Admins (SuperAdmin + 4 Batch Representatives + Student Test Account)
INSERT INTO public.admins (id, username, email, password_hash, name, role, representative_course, representative_role, permissions, is_active, created_at)
VALUES ('admin-1', 'ucrtvrepb11', 'hesansamudika20@gmail.com', '$2a$10$guYS0z1muZCkV2HlcFMlAuoBNjSQE0csHskDumgBIVsH5lNldBsn.', 'Television Studies Administrator', 'superadmin', NULL, NULL, ARRAY['students:read', 'students:write', 'attendance:read', 'attendance:write', 'timetables:write', 'assignments:write', 'chat:moderate', 'tools:pdf', 'backups:manage', 'admins:manage'], TRUE, '2026-01-10T10:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    representative_course = EXCLUDED.representative_course,
    representative_role = EXCLUDED.representative_role,
    permissions = EXCLUDED.permissions;
INSERT INTO public.admins (id, username, email, password_hash, name, role, representative_course, representative_role, permissions, is_active, created_at)
VALUES ('admin-rep-hesan', 'hesan', 'hesan@rep.ucr.ac.lk', '$2a$10$guYS0z1muZCkV2HlcFMlAuoBNjSQE0csHskDumgBIVsH5lNldBsn.', 'P.A. Hesan Samudika', 'representative', 'TPOPT', 'Male Representative', ARRAY['students:read', 'students:write', 'attendance:read', 'attendance:write', 'timetables:write', 'assignments:write', 'chat:moderate', 'tools:pdf'], TRUE, '2026-01-15T08:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    representative_course = EXCLUDED.representative_course,
    representative_role = EXCLUDED.representative_role,
    permissions = EXCLUDED.permissions;
INSERT INTO public.admins (id, username, email, password_hash, name, role, representative_course, representative_role, permissions, is_active, created_at)
VALUES ('admin-rep-tharushika', 'tharushika', 'tharushika@rep.ucr.ac.lk', '$2a$10$guYS0z1muZCkV2HlcFMlAuoBNjSQE0csHskDumgBIVsH5lNldBsn.', 'P. Tharushika Nethmi', 'representative', 'TPOPT', 'Female Representative', ARRAY['students:read', 'students:write', 'attendance:read', 'attendance:write', 'timetables:write', 'assignments:write', 'chat:moderate', 'tools:pdf'], TRUE, '2026-01-15T08:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    representative_course = EXCLUDED.representative_course,
    representative_role = EXCLUDED.representative_role,
    permissions = EXCLUDED.permissions;
INSERT INTO public.admins (id, username, email, password_hash, name, role, representative_course, representative_role, permissions, is_active, created_at)
VALUES ('admin-rep-rafidh', 'rafidh', 'rafidh@rep.ucr.ac.lk', '$2a$10$guYS0z1muZCkV2HlcFMlAuoBNjSQE0csHskDumgBIVsH5lNldBsn.', 'M. Rafidh Rizwan', 'representative', 'TPRPT', 'Male Representative', ARRAY['students:read', 'students:write', 'attendance:read', 'attendance:write', 'timetables:write', 'assignments:write', 'chat:moderate', 'tools:pdf'], TRUE, '2026-01-15T08:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    representative_course = EXCLUDED.representative_course,
    representative_role = EXCLUDED.representative_role,
    permissions = EXCLUDED.permissions;
INSERT INTO public.admins (id, username, email, password_hash, name, role, representative_course, representative_role, permissions, is_active, created_at)
VALUES ('admin-rep-yenuki', 'yenuki', 'yenuki@rep.ucr.ac.lk', '$2a$10$guYS0z1muZCkV2HlcFMlAuoBNjSQE0csHskDumgBIVsH5lNldBsn.', 'Yenuki Ruhansa Atapattu', 'representative', 'TPRPT', 'Female Representative', ARRAY['students:read', 'students:write', 'attendance:read', 'attendance:write', 'timetables:write', 'assignments:write', 'chat:moderate', 'tools:pdf'], TRUE, '2026-01-15T08:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    representative_course = EXCLUDED.representative_course,
    representative_role = EXCLUDED.representative_role,
    permissions = EXCLUDED.permissions;

-- Seed 48 Batch 11 Students (26 TPOPT + 22 TPRPT)
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-001', 'D.G. Dissanayaka', 'RT/TPOPT/26/01', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-005', 'P.A. Hesan Samudika', 'RT/TPOPT/26/02', 'TPOPT', 'Batch 11 — 2026', 'Male', TRUE, 'Male Representative', '+94 78 897 8729', NULL, NULL, NULL, NULL, NULL, ARRAY['label-rep'], 'Appointed batch representative for TPOPT intake 2026.', '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-006', 'J.L.S. Rithsara', 'RT/TPOPT/26/03', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-026', 'H.D.U.T. Kumara', 'RT/TPOPT/26/04', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-009', 'H.K.S.S. Habaraduwa', 'RT/TPOPT/26/05', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-011', 'A.L.A. Eshan Nimsara', 'RT/TPOPT/26/06', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-029', 'Chamitha', 'RT/TPOPT/26/07', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-021', 'K. Prabhash Manuja Janadhi', 'RT/TPOPT/26/08', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-018', 'H.M. Siluni Raveesha', 'RT/TPOPT/26/09', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-013', 'P.A. Shalindi Geethma Perera', 'RT/TPOPT/26/10', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-015', 'M.D. Chiranjeewani Ransimala', 'RT/TPOPT/26/11', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-020', 'C.A. Nisansala', 'RT/TPOPT/26/12', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-025', 'B.B. Kaveesha Chamod Jayasekara', 'RT/TPOPT/26/13', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-019', 'A.D. Ruchira Sahan Samarasingha', 'RT/TPOPT/26/14', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-014', 'W.A. Achintha Dineth Weerasooriya', 'RT/TPOPT/26/15', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, '', NULL, NULL, NULL, NULL, NULL, '{}', '', '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-027', 'W.G.K. Kalindu Praveen Charuka', 'RT/TPOPT/26/16', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-028', 'K.G. Pasindu Dilshan', 'RT/TPOPT/26/17', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-023', 'R.L. Kasun Sandeepa', 'RT/TPOPT/26/18', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-017', 'W. Kalana Latharu', 'RT/TPOPT/26/19', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-016', 'T.R. Wickramarathna', 'RT/TPOPT/26/20', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-007', 'I.W. Sandas Nethra Lankawera', 'RT/TPOPT/26/21', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-003', 'P. Tharushika Nethmi', 'RT/TPOPT/26/22', 'TPOPT', 'Batch 11 — 2026', 'Female', TRUE, 'Female Representative', '+94 77 952 0533', NULL, NULL, NULL, NULL, NULL, ARRAY['label-rep'], 'Appointed batch representative for TPOPT intake 2026.', '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-010', 'R.P. Keshani Vimansa Rajapaksha', 'RT/TPOPT/26/23', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-004', 'H.K. Praveen Moshaka', 'RT/TPOPT/26/24', 'TPOPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-002', 'T.H. Maleesha', 'RT/TPOPT/26/25', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tpopt-022', 'H.P. Sakuni Harshani Samaraweera', 'RT/TPOPT/26/26', 'TPOPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-013', 'R.R.M.K.G.T. Vimal Aweera', 'RT/TPRPT/26/01', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-025', 'N.H.N. Pubudunee', 'RT/TPRPT/26/02', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-018', 'W.A.D.T.K. Thilakarathna', 'RT/TPRPT/26/03', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-028', 'H.A.G. Gimhani', 'RT/TPRPT/26/04', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-027', 'H.R.M.N.K. Prebodika', 'RT/TPRPT/26/05', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-029', 'T. Anushiyan', 'RT/TPRPT/26/06', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-019', 'R.A.P.G. Karunarathna', 'RT/TPRPT/26/07', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-011', 'M.M.T. Sankalpana', 'RT/TPRPT/26/09', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-021', 'K.B.H. Udamya', 'RT/TPRPT/26/10', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-014', 'K.G. Isuru Madhusanka', 'RT/TPRPT/26/11', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-import-012', 'J.M.D.N. Mannaperuma', 'RT/TPRPT/26/12', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-11-03T12:00:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-026', 'P.A. Danindu Naveendra', 'RT/TPRPT/26/13', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-002', 'M. Rafidh Rizwan', 'RT/TPRPT/26/14', 'TPRPT', 'Batch 11 — 2026', 'Male', TRUE, 'Male Representative', '+94 76 372 6829', NULL, NULL, NULL, NULL, NULL, ARRAY['label-rep'], 'Appointed batch representative for TPRPT intake 2026.', '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-007', 'R.A.D.S.P. Gunasekara', 'RT/TPRPT/26/15', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-017', 'G.D.M. Rubasinghe', 'RT/TPRPT/26/16', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-003', 'W.A.T.L. Abesekara', 'RT/TPRPT/26/17', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-001', 'F.D.R. Bandara', 'RT/TPRPT/26/18', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-020', 'A.G.H.P. Dayarathna', 'RT/TPRPT/26/19', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-010', 'S.A.S.S. Samarasinghe', 'RT/TPRPT/26/20', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-015', 'Yenuki Ruhansa Atapattu', 'RT/TPRPT/26/21', 'TPRPT', 'Batch 11 — 2026', 'Female', TRUE, 'Female Representative', '+94 71 215 4389', NULL, NULL, NULL, NULL, NULL, ARRAY['label-rep'], 'Appointed batch representative for TPRPT intake 2026.', '2026-01-15T08:30:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-import-022', 'A.D.R.S. Kumari', 'RT/TPRPT/26/22', 'TPRPT', 'Batch 11 — 2026', 'Female', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-11-03T12:00:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;
INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES ('student-tprpt-import-023', 'H.A.M. Nimsara', 'RT/TPRPT/26/23', 'TPRPT', 'Batch 11 — 2026', 'Male', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, '2026-11-03T12:00:00.000Z', '2026-11-03T12:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_number = EXCLUDED.student_number,
    course = EXCLUDED.course,
    batch = EXCLUDED.batch,
    gender = EXCLUDED.gender,
    is_representative = EXCLUDED.is_representative,
    representative_role = EXCLUDED.representative_role,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    residential_address = EXCLUDED.residential_address,
    parent_guardian_name = EXCLUDED.parent_guardian_name,
    parent_guardian_phone = EXCLUDED.parent_guardian_phone,
    emergency_contact = EXCLUDED.emergency_contact,
    labels = EXCLUDED.labels,
    notes = EXCLUDED.notes;

-- Seed Active Student Activation Invitations
INSERT INTO public.student_invitations (id, code, token, student_id, student_number, student_name, course, role, expires_at, is_used, created_at)
VALUES ('inv-tpopt-01', 'UCR-2026-TPOPT-7721', 'UCR-2026-TPOPT-7721', NULL, NULL, 'General TPOPT Intake', 'TPOPT', 'student', '2026-12-31T23:59:59Z', FALSE, '2026-11-12T19:12:34.451Z')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, token = EXCLUDED.token, is_used = EXCLUDED.is_used;
INSERT INTO public.student_invitations (id, code, token, student_id, student_number, student_name, course, role, expires_at, is_used, created_at)
VALUES ('inv-tprpt-01', 'UCR-2026-TPRPT-9932', 'UCR-2026-TPRPT-9932', NULL, NULL, 'General TPRPT Intake', 'TPRPT', 'student', '2026-12-31T23:59:59Z', FALSE, '2026-11-12T19:12:34.451Z')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, token = EXCLUDED.token, is_used = EXCLUDED.is_used;

-- Seed Full Institutional Timetables (TPOPT & TPRPT)
INSERT INTO public.timetables (id, category, course, title, subtitle, batch_label, pdf_url, is_published, slots, created_at, updated_at)
VALUES ('timetable-foundation-tpopt', 'foundation', 'TPOPT', 'Academic Time Table – Foundation Programme – 11th Batch', 'Television & Digital Media Post Production Technology', '11th Batch', '/timetables/TPOPT.pdf', TRUE, '[{"id":"timetable-foundation-tpopt-monday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"","slotType":"empty","sortOrder":1},{"id":"timetable-foundation-tpopt-monday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"","slotType":"empty","sortOrder":2},{"id":"timetable-foundation-tpopt-monday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":3},{"id":"timetable-foundation-tpopt-monday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"ENGLISH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":4},{"id":"timetable-foundation-tpopt-monday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"ENGLISH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":5},{"id":"timetable-foundation-tpopt-monday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":6},{"id":"timetable-foundation-tpopt-monday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"DM10","studentGroup":"A/L Students","slotType":"class","sortOrder":7},{"id":"timetable-foundation-tpopt-monday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"DM10","studentGroup":"A/L Students","slotType":"class","sortOrder":8},{"id":"timetable-foundation-tpopt-monday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":9},{"id":"timetable-foundation-tpopt-monday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Monday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"DM10","studentGroup":"A/L Students","slotType":"class","sortOrder":10},{"id":"timetable-foundation-tpopt-tuesday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":11},{"id":"timetable-foundation-tpopt-tuesday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":12},{"id":"timetable-foundation-tpopt-tuesday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":13},{"id":"timetable-foundation-tpopt-tuesday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":14},{"id":"timetable-foundation-tpopt-tuesday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":15},{"id":"timetable-foundation-tpopt-tuesday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":16},{"id":"timetable-foundation-tpopt-tuesday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":17},{"id":"timetable-foundation-tpopt-tuesday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":18},{"id":"timetable-foundation-tpopt-tuesday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":19},{"id":"timetable-foundation-tpopt-tuesday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Tuesday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":20},{"id":"timetable-foundation-tpopt-wednesday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":21},{"id":"timetable-foundation-tpopt-wednesday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":22},{"id":"timetable-foundation-tpopt-wednesday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":23},{"id":"timetable-foundation-tpopt-wednesday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":24},{"id":"timetable-foundation-tpopt-wednesday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":25},{"id":"timetable-foundation-tpopt-wednesday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":26},{"id":"timetable-foundation-tpopt-wednesday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":27},{"id":"timetable-foundation-tpopt-wednesday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":28},{"id":"timetable-foundation-tpopt-wednesday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":29},{"id":"timetable-foundation-tpopt-wednesday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Wednesday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":30},{"id":"timetable-foundation-tpopt-thursday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":31},{"id":"timetable-foundation-tpopt-thursday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":32},{"id":"timetable-foundation-tpopt-thursday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":33},{"id":"timetable-foundation-tpopt-thursday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":34},{"id":"timetable-foundation-tpopt-thursday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":35},{"id":"timetable-foundation-tpopt-thursday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":36},{"id":"timetable-foundation-tpopt-thursday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":37},{"id":"timetable-foundation-tpopt-thursday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":38},{"id":"timetable-foundation-tpopt-thursday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":39},{"id":"timetable-foundation-tpopt-thursday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Thursday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":40},{"id":"timetable-foundation-tpopt-friday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"","slotType":"empty","sortOrder":41},{"id":"timetable-foundation-tpopt-friday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"","slotType":"empty","sortOrder":42},{"id":"timetable-foundation-tpopt-friday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":43},{"id":"timetable-foundation-tpopt-friday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"ICT","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":44},{"id":"timetable-foundation-tpopt-friday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"ICT","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":45},{"id":"timetable-foundation-tpopt-friday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":46},{"id":"timetable-foundation-tpopt-friday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"","slotType":"empty","sortOrder":47},{"id":"timetable-foundation-tpopt-friday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"","slotType":"empty","sortOrder":48},{"id":"timetable-foundation-tpopt-friday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":49},{"id":"timetable-foundation-tpopt-friday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Friday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"","slotType":"empty","sortOrder":50},{"id":"timetable-foundation-tpopt-saturday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":51},{"id":"timetable-foundation-tpopt-saturday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":52},{"id":"timetable-foundation-tpopt-saturday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":53},{"id":"timetable-foundation-tpopt-saturday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":54},{"id":"timetable-foundation-tpopt-saturday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":55},{"id":"timetable-foundation-tpopt-saturday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":56},{"id":"timetable-foundation-tpopt-saturday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"Engineering Drawings","studentGroup":"NVQ Students","slotType":"class","sortOrder":57},{"id":"timetable-foundation-tpopt-saturday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"","slotType":"empty","sortOrder":58},{"id":"timetable-foundation-tpopt-saturday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":59},{"id":"timetable-foundation-tpopt-saturday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Saturday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"","slotType":"empty","sortOrder":60},{"id":"timetable-foundation-tpopt-sunday-0830","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":61},{"id":"timetable-foundation-tpopt-sunday-0930","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":62},{"id":"timetable-foundation-tpopt-sunday-1030","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":63},{"id":"timetable-foundation-tpopt-sunday-1040","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":64},{"id":"timetable-foundation-tpopt-sunday-1140","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":65},{"id":"timetable-foundation-tpopt-sunday-1240","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":66},{"id":"timetable-foundation-tpopt-sunday-1320","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"","slotType":"empty","sortOrder":67},{"id":"timetable-foundation-tpopt-sunday-1420","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"","slotType":"empty","sortOrder":68},{"id":"timetable-foundation-tpopt-sunday-1520","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":69},{"id":"timetable-foundation-tpopt-sunday-1530","timetableId":"timetable-foundation-tpopt","dayOfWeek":"Sunday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"","slotType":"empty","sortOrder":70}]'::jsonb, '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, slots = EXCLUDED.slots, is_published = EXCLUDED.is_published;
INSERT INTO public.timetables (id, category, course, title, subtitle, batch_label, pdf_url, is_published, slots, created_at, updated_at)
VALUES ('timetable-foundation-tprpt', 'foundation', 'TPRPT', 'Academic Time Table – Foundation Programme – 11th Batch', 'Television & Digital Media Production Technology', '11th Batch', '/timetables/TPRPT.pdf', TRUE, '[{"id":"timetable-foundation-tprpt-monday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"","slotType":"empty","sortOrder":1},{"id":"timetable-foundation-tprpt-monday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"","slotType":"empty","sortOrder":2},{"id":"timetable-foundation-tprpt-monday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":3},{"id":"timetable-foundation-tprpt-monday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"ENGLISH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":4},{"id":"timetable-foundation-tprpt-monday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"ENGLISH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":5},{"id":"timetable-foundation-tprpt-monday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":6},{"id":"timetable-foundation-tprpt-monday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"DM10","studentGroup":"A/L Students","slotType":"class","sortOrder":7},{"id":"timetable-foundation-tprpt-monday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"DM10","studentGroup":"A/L Students","slotType":"class","sortOrder":8},{"id":"timetable-foundation-tprpt-monday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":9},{"id":"timetable-foundation-tprpt-monday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Monday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"DM10","studentGroup":"A/L Students","slotType":"class","sortOrder":10},{"id":"timetable-foundation-tprpt-tuesday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":11},{"id":"timetable-foundation-tprpt-tuesday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":12},{"id":"timetable-foundation-tprpt-tuesday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":13},{"id":"timetable-foundation-tprpt-tuesday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":14},{"id":"timetable-foundation-tprpt-tuesday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":15},{"id":"timetable-foundation-tprpt-tuesday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":16},{"id":"timetable-foundation-tprpt-tuesday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":17},{"id":"timetable-foundation-tprpt-tuesday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":18},{"id":"timetable-foundation-tprpt-tuesday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":19},{"id":"timetable-foundation-tprpt-tuesday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Tuesday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"Gaffer","studentGroup":"A/L Students","slotType":"class","sortOrder":20},{"id":"timetable-foundation-tprpt-wednesday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":21},{"id":"timetable-foundation-tprpt-wednesday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":22},{"id":"timetable-foundation-tprpt-wednesday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":23},{"id":"timetable-foundation-tprpt-wednesday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":24},{"id":"timetable-foundation-tprpt-wednesday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":25},{"id":"timetable-foundation-tprpt-wednesday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":26},{"id":"timetable-foundation-tprpt-wednesday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":27},{"id":"timetable-foundation-tprpt-wednesday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":28},{"id":"timetable-foundation-tprpt-wednesday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":29},{"id":"timetable-foundation-tprpt-wednesday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Wednesday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"DM7","studentGroup":"A/L Students","slotType":"class","sortOrder":30},{"id":"timetable-foundation-tprpt-thursday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":31},{"id":"timetable-foundation-tprpt-thursday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":32},{"id":"timetable-foundation-tprpt-thursday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":33},{"id":"timetable-foundation-tprpt-thursday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":34},{"id":"timetable-foundation-tprpt-thursday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"NVQ Physics I,II","studentGroup":"NVQ Students","slotType":"class","sortOrder":35},{"id":"timetable-foundation-tprpt-thursday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":36},{"id":"timetable-foundation-tprpt-thursday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"","slotType":"empty","sortOrder":37},{"id":"timetable-foundation-tprpt-thursday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"","slotType":"empty","sortOrder":38},{"id":"timetable-foundation-tprpt-thursday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":39},{"id":"timetable-foundation-tprpt-thursday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Thursday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"","slotType":"empty","sortOrder":40},{"id":"timetable-foundation-tprpt-friday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":41},{"id":"timetable-foundation-tprpt-friday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":42},{"id":"timetable-foundation-tprpt-friday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":43},{"id":"timetable-foundation-tprpt-friday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"ICT","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":44},{"id":"timetable-foundation-tprpt-friday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"ICT","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":45},{"id":"timetable-foundation-tprpt-friday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":46},{"id":"timetable-foundation-tprpt-friday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":47},{"id":"timetable-foundation-tprpt-friday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":48},{"id":"timetable-foundation-tprpt-friday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":49},{"id":"timetable-foundation-tprpt-friday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Friday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"Computer Graphic Designer","studentGroup":"A/L Students","slotType":"class","sortOrder":50},{"id":"timetable-foundation-tprpt-saturday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":51},{"id":"timetable-foundation-tprpt-saturday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":52},{"id":"timetable-foundation-tprpt-saturday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":53},{"id":"timetable-foundation-tprpt-saturday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":54},{"id":"timetable-foundation-tprpt-saturday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"Maths","studentGroup":"NVQ Students","slotType":"class","sortOrder":55},{"id":"timetable-foundation-tprpt-saturday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":56},{"id":"timetable-foundation-tprpt-saturday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"Engineering Drawing","studentGroup":"NVQ Students","slotType":"class","sortOrder":57},{"id":"timetable-foundation-tprpt-saturday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"","slotType":"empty","sortOrder":58},{"id":"timetable-foundation-tprpt-saturday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":59},{"id":"timetable-foundation-tprpt-saturday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Saturday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"","slotType":"empty","sortOrder":60},{"id":"timetable-foundation-tprpt-sunday-0830","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"08:30","endTime":"09:30","timeLabel":"8:30 a.m. – 9:30 a.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":61},{"id":"timetable-foundation-tprpt-sunday-0930","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"09:30","endTime":"10:30","timeLabel":"9:30 a.m. – 10:30 a.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":62},{"id":"timetable-foundation-tprpt-sunday-1030","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"10:30","endTime":"10:40","timeLabel":"10:30 a.m. – 10:40 a.m.","subject":"Break","slotType":"break","sortOrder":63},{"id":"timetable-foundation-tprpt-sunday-1040","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"10:40","endTime":"11:40","timeLabel":"10:40 a.m. – 11:40 a.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":64},{"id":"timetable-foundation-tprpt-sunday-1140","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"11:40","endTime":"12:40","timeLabel":"11:40 a.m. – 12:40 p.m.","subject":"OSH","studentGroup":"A/L & NVQ Students","slotType":"class","sortOrder":65},{"id":"timetable-foundation-tprpt-sunday-1240","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"12:40","endTime":"13:20","timeLabel":"12:40 p.m. – 1:20 p.m.","subject":"Lunch Break","slotType":"lunch","sortOrder":66},{"id":"timetable-foundation-tprpt-sunday-1320","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"13:20","endTime":"14:20","timeLabel":"1:20 p.m. – 2:20 p.m.","subject":"","slotType":"empty","sortOrder":67},{"id":"timetable-foundation-tprpt-sunday-1420","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"14:20","endTime":"15:20","timeLabel":"2:20 p.m. – 3:20 p.m.","subject":"","slotType":"empty","sortOrder":68},{"id":"timetable-foundation-tprpt-sunday-1520","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"15:20","endTime":"15:30","timeLabel":"3:20 p.m. – 3:30 p.m.","subject":"Break","slotType":"break","sortOrder":69},{"id":"timetable-foundation-tprpt-sunday-1530","timetableId":"timetable-foundation-tprpt","dayOfWeek":"Sunday","startTime":"15:30","endTime":"16:30","timeLabel":"3:30 p.m. – 4:30 p.m.","subject":"","slotType":"empty","sortOrder":70}]'::jsonb, '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, slots = EXCLUDED.slots, is_published = EXCLUDED.is_published;

-- Seed Academic Assignments
INSERT INTO public.assignment_schedules (id, title, description, course, module_id, module_title, issue_date, deadline, priority, status, external_links, attachments, created_by_admin_id, created_by_admin_name, created_at, updated_at)
VALUES ('assign-1', 'Practical Exercise: Multi-Camera Studio Setup', 'Prepare lighting grid floor plan and studio intercom mapping for 3-camera pedestal deployment.', 'TPRPT', 'mod-2', 'Multi-Camera Television Studio Production', '2026-11-10', '2026-11-20T23:59:00', 'important', 'active', '[{"title":"Studio Floor Protocol Guide","url":"https://ucr.ac.lk/downloads/studio-guidelines.pdf"}]'::jsonb, '[]'::jsonb, 'admin-1', 'Television Studies Administrator', '2026-11-10T10:00:00.000Z', '2026-11-10T10:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, deadline = EXCLUDED.deadline, status = EXCLUDED.status;
INSERT INTO public.assignment_schedules (id, title, description, course, module_id, module_title, issue_date, deadline, priority, status, external_links, attachments, created_by_admin_id, created_by_admin_name, created_at, updated_at)
VALUES ('assign-2', 'Rough Cut Proxy Workflow Assignment', 'Ingest raw camera media, generate ProRes proxy media, and assemble first-pass scene montage with sync audio.', 'TPOPT', 'mod-1', 'Non-Linear Video Editing & Workflow Systems', '2026-11-11', '2026-11-25T18:00:00', 'normal', 'active', '[]'::jsonb, '[]'::jsonb, 'admin-1', 'Television Studies Administrator', '2026-11-11T14:30:00.000Z', '2026-11-11T14:30:00.000Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, deadline = EXCLUDED.deadline, status = EXCLUDED.status;

-- Seed Initial Division Chat Messages
INSERT INTO public.chat_messages (id, sender_id, sender_name, sender_role, sender_avatar, course, text, attachment, task_mention, created_at)
VALUES ('msg-init-1', 'admin-1', 'Television Studies Administrator', 'SuperAdmin', NULL, NULL, 'Official Division Chat for Batch 11 (2026 Intake). Timetable announcements, live lecture notices, and assignment submissions are tracked here.', NULL, NULL, '2026-11-12T19:12:34.450Z')
ON CONFLICT (id) DO NOTHING;
