const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (Array.isArray(val) || typeof val === 'object') {
    return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  }
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function sqlArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "'{}'";
  return "ARRAY[" + arr.map(item => "'" + String(item).replace(/'/g, "''") + "'").join(', ') + "]";
}

let sql = `-- ==============================================================================
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

-- 3. Student Invitations Table (30-day token auth)
DROP TABLE IF EXISTS public.student_invitations CASCADE;
CREATE TABLE public.student_invitations (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    token TEXT,
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
`;

// Seed Admins
sql += `\n-- Seed Admins (SuperAdmin + 4 Batch Representatives + Student Test Account)\n`;
for (const a of db.admins) {
  sql += `INSERT INTO public.admins (id, username, email, password_hash, name, role, representative_course, representative_role, permissions, is_active, created_at)
VALUES (${sqlEscape(a.id)}, ${sqlEscape(a.username)}, ${sqlEscape(a.email)}, ${sqlEscape(a.passwordHash)}, ${sqlEscape(a.name)}, ${sqlEscape(a.role)}, ${sqlEscape(a.representativeCourse)}, ${sqlEscape(a.representativeRole)}, ${sqlArray(a.permissions)}, ${a.isActive ? 'TRUE' : 'FALSE'}, ${sqlEscape(a.createdAt)})
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    representative_course = EXCLUDED.representative_course,
    representative_role = EXCLUDED.representative_role,
    permissions = EXCLUDED.permissions;\n`;
}

// Seed Students
sql += `\n-- Seed 48 Batch 11 Students (26 TPOPT + 22 TPRPT)\n`;
for (const s of db.students) {
  sql += `INSERT INTO public.students (id, full_name, student_number, course, batch, gender, is_representative, representative_role, phone_number, email, residential_address, parent_guardian_name, parent_guardian_phone, emergency_contact, labels, notes, created_at, updated_at)
VALUES (${sqlEscape(s.id)}, ${sqlEscape(s.fullName)}, ${sqlEscape(s.studentNumber)}, ${sqlEscape(s.course)}, ${sqlEscape(s.batch)}, ${sqlEscape(s.gender)}, ${s.isRepresentative ? 'TRUE' : 'FALSE'}, ${sqlEscape(s.representativeRole)}, ${sqlEscape(s.phoneNumber)}, ${sqlEscape(s.email)}, ${sqlEscape(s.residentialAddress)}, ${sqlEscape(s.parentGuardianName)}, ${sqlEscape(s.parentGuardianPhone)}, ${sqlEscape(s.emergencyContact)}, ${sqlArray(s.labels)}, ${sqlEscape(s.notes)}, ${sqlEscape(s.createdAt)}, ${sqlEscape(s.updatedAt)})
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
    notes = EXCLUDED.notes;\n`;
}

// Seed Invitations
sql += `\n-- Seed Active Student Activation Invitations\n`;
for (const inv of db.invitations) {
  const codeVal = inv.code || inv.token || 'UCR-2026-INV';
  const roleVal = inv.role || 'student';
  sql += `INSERT INTO public.student_invitations (id, code, token, student_id, student_number, student_name, course, role, expires_at, is_used, created_at)
VALUES (${sqlEscape(inv.id)}, ${sqlEscape(codeVal)}, ${sqlEscape(codeVal)}, ${sqlEscape(inv.studentId || null)}, ${sqlEscape(inv.studentNumber || null)}, ${sqlEscape(inv.studentName)}, ${sqlEscape(inv.course)}, ${sqlEscape(roleVal)}, ${sqlEscape(inv.expiresAt)}, ${inv.isUsed ? 'TRUE' : 'FALSE'}, ${sqlEscape(inv.createdAt)})
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, token = EXCLUDED.token, is_used = EXCLUDED.is_used;\n`;
}

// Seed Timetables
sql += `\n-- Seed Full Institutional Timetables (TPOPT & TPRPT)\n`;
for (const tt of db.timetables) {
  sql += `INSERT INTO public.timetables (id, category, course, title, subtitle, batch_label, pdf_url, is_published, slots, created_at, updated_at)
VALUES (${sqlEscape(tt.id)}, ${sqlEscape(tt.category)}, ${sqlEscape(tt.course)}, ${sqlEscape(tt.title)}, ${sqlEscape(tt.subtitle)}, ${sqlEscape(tt.batchLabel)}, ${sqlEscape(tt.pdfUrl)}, ${tt.isPublished ? 'TRUE' : 'FALSE'}, ${sqlEscape(tt.slots)}, ${sqlEscape(tt.createdAt)}, ${sqlEscape(tt.updatedAt)})
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, slots = EXCLUDED.slots, is_published = EXCLUDED.is_published;\n`;
}

// Seed Assignments
sql += `\n-- Seed Academic Assignments\n`;
for (const asg of db.assignments) {
  sql += `INSERT INTO public.assignment_schedules (id, title, description, course, module_id, module_title, issue_date, deadline, priority, status, external_links, attachments, created_by_admin_id, created_by_admin_name, created_at, updated_at)
VALUES (${sqlEscape(asg.id)}, ${sqlEscape(asg.title)}, ${sqlEscape(asg.description)}, ${sqlEscape(asg.course)}, ${sqlEscape(asg.moduleId)}, ${sqlEscape(asg.moduleTitle)}, ${sqlEscape(asg.issueDate)}, ${sqlEscape(asg.deadline)}, ${sqlEscape(asg.priority)}, ${sqlEscape(asg.status)}, ${sqlEscape(asg.externalLinks)}, ${sqlEscape(asg.attachments)}, ${sqlEscape(asg.createdByAdminId)}, ${sqlEscape(asg.createdByAdminName)}, ${sqlEscape(asg.createdAt)}, ${sqlEscape(asg.updatedAt)})
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, deadline = EXCLUDED.deadline, status = EXCLUDED.status;\n`;
}

// Seed initial chat message
if (db.chatMessages && db.chatMessages.length > 0) {
  sql += `\n-- Seed Initial Division Chat Messages\n`;
  for (const m of db.chatMessages) {
    const senderIdVal = m.senderId || 'admin-1';
    sql += `INSERT INTO public.chat_messages (id, sender_id, sender_name, sender_role, sender_avatar, course, text, attachment, task_mention, created_at)
VALUES (${sqlEscape(m.id)}, ${sqlEscape(senderIdVal)}, ${sqlEscape(m.senderName)}, ${sqlEscape(m.senderRole || 'SuperAdmin')}, ${sqlEscape(m.senderAvatar || null)}, ${sqlEscape(m.course || null)}, ${sqlEscape(m.text)}, ${sqlEscape(m.attachment || null)}, ${sqlEscape(m.taskMention || null)}, ${sqlEscape(m.createdAt)})
ON CONFLICT (id) DO NOTHING;\n`;
  }
}

const outDir = path.join(__dirname, '..', 'supabase', 'migrations');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath002 = path.join(outDir, '002_complete_system_with_storage_and_rls.sql');
fs.writeFileSync(outPath002, sql, 'utf8');
console.log('Written:', outPath002, 'Size:', sql.length, 'bytes');

// Also create a single consolidated master schema file for one-paste Supabase execution
const file001 = fs.readFileSync(path.join(outDir, '001_foundation_and_admin_core.sql'), 'utf8');
const unifiedSql = `-- ==============================================================================
-- UNIVERSITY COLLEGE OF RATHMALANA (UCR) - DIVISION OF TELEVISION STUDIES
-- COMPLETE UNIFIED DATABASE SCHEMA, STORAGE BUCKETS, RLS POLICIES & SEED DATA
-- Target: Supabase PostgreSQL (Batch 11 — 2026 Intake)
-- ==============================================================================

-- PART 1: FOUNDATION AND CORE TABLES
` + file001 + `\n\n-- PART 2: STUDENT ACTIVATION, SUBMISSIONS, CHAT & STORAGE\n` + sql;

const masterPath = path.join(__dirname, '..', 'supabase', 'complete_unified_schema_and_seed.sql');
fs.writeFileSync(masterPath, unifiedSql, 'utf8');
console.log('Written Master File:', masterPath, 'Size:', unifiedSql.length, 'bytes');
