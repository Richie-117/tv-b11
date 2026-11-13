import fs from 'fs';
import path from 'path';
import {
  Student,
  AdminUser,
  StudentLabel,
  AttendanceSession,
  AttendanceRecord,
  Timetable,
  TimetableOverride,
  Assignment,
  CourseModule,
  CourseType,
} from '@/types';
import { isSupabaseConfigured, getSupabaseAdmin } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseState {
  students: Student[];
  studentLabels: StudentLabel[];
  admins: (AdminUser & { passwordHash: string })[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  timetables: Timetable[];
  timetableOverrides: TimetableOverride[];
  assignments: Assignment[];
  modules: CourseModule[];
  learningStages?: any[];
  lecturers?: any[];
  auditLogs: any[];
  userPreferences?: Record<string, any>;
  chatMessages?: any[];
  taskSubmissions?: any[];
  invitations?: any[];
}

let memoryCache: DatabaseState | null = null;
let writeQueue: Promise<any> = Promise.resolve();

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const emptyState: DatabaseState = {
      students: [],
      studentLabels: [],
      admins: [],
      attendanceSessions: [],
      attendanceRecords: [],
      timetables: [],
      timetableOverrides: [],
      assignments: [],
      modules: [],
      auditLogs: [],
      userPreferences: {
        mobileVisibleTabs: ['dashboard', 'students', 'attendance', 'timetable', 'tools'],
        theme: 'dark',
      },
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyState, null, 2), 'utf8');
  }
}

export async function getLocalDatabase(): Promise<DatabaseState> {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    memoryCache = parsed;
    return parsed;
  } catch (err) {
    if (memoryCache) return memoryCache;
    console.error('Error reading local db.json:', err);
    throw err;
  }
}

export async function saveLocalDatabase(updater: (state: DatabaseState) => void | DatabaseState): Promise<DatabaseState> {
  ensureDataFile();
  const nextTask: Promise<DatabaseState> = writeQueue.then(async () => {
    const current = await getLocalDatabase();
    const result = updater(current);
    const updated: DatabaseState = result || current;
    memoryCache = updated;
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  });
  writeQueue = nextTask.catch(() => {});
  return nextTask;
}

// ==========================================
// Students
// ==========================================
export async function getStudents(): Promise<Student[]> {
  const localDb = await getLocalDatabase();

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('students').select('*').order('student_number', { ascending: true });
      if (!error && data) {
        return data.map((r: any) => {
          const localMatch = (localDb.students || []).find(
            (s) => s.id === r.id || s.studentNumber === r.student_number
          );
          return {
            id: r.id,
            fullName: r.full_name,
            studentNumber: r.student_number,
            course: r.course,
            batch: r.batch,
            gender: r.gender,
            isRepresentative: r.is_representative,
            representativeRole: r.representative_role,
            phoneNumber: r.phone_number || localMatch?.phoneNumber,
            email: r.email || localMatch?.email,
            residentialAddress: r.residential_address || localMatch?.residentialAddress,
            parentGuardianName: r.parent_guardian_name || localMatch?.parentGuardianName,
            parentGuardianPhone: r.parent_guardian_phone || localMatch?.parentGuardianPhone,
            emergencyContact: r.emergency_contact || localMatch?.emergencyContact,
            profileImageUrl: r.profile_image_url || localMatch?.profileImageUrl,
            labels: r.labels || localMatch?.labels || [],
            notes: r.notes || localMatch?.notes,
            passwordHash: r.password_hash || (localMatch as any)?.passwordHash,
            isActivated: Boolean(r.is_activated || (localMatch as any)?.isActivated),
            activatedAt: r.activated_at || (localMatch as any)?.activatedAt,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          } as any;
        });
      }
    } catch (err) {
      console.warn('Supabase getStudents failed, falling back to local file:', err);
    }
  }

  return localDb.students || [];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const students = await getStudents();
  return students.find((s) => s.id === id) || null;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const dbRow: any = { updated_at: new Date().toISOString() };
      if (updates.fullName !== undefined) dbRow.full_name = updates.fullName;
      if (updates.course !== undefined) dbRow.course = updates.course;
      if (updates.gender !== undefined) dbRow.gender = updates.gender;
      if (updates.phoneNumber !== undefined) dbRow.phone_number = updates.phoneNumber;
      if (updates.email !== undefined) dbRow.email = updates.email;
      if (updates.residentialAddress !== undefined) dbRow.residential_address = updates.residentialAddress;
      if (updates.parentGuardianName !== undefined) dbRow.parent_guardian_name = updates.parentGuardianName;
      if (updates.parentGuardianPhone !== undefined) dbRow.parent_guardian_phone = updates.parentGuardianPhone;
      if (updates.emergencyContact !== undefined) dbRow.emergency_contact = updates.emergencyContact;
      if (updates.profileImageUrl !== undefined) dbRow.profile_image_url = updates.profileImageUrl;
      if (updates.labels !== undefined) dbRow.labels = updates.labels;
      if (updates.notes !== undefined) dbRow.notes = updates.notes;

      const { data, error } = await supabase.from('students').update(dbRow).eq('id', id).select().single();
      if (!error && data) {
        return {
          id: data.id,
          fullName: data.full_name,
          studentNumber: data.student_number,
          course: data.course,
          batch: data.batch,
          gender: data.gender,
          isRepresentative: data.is_representative,
          representativeRole: data.representative_role,
          phoneNumber: data.phone_number,
          email: data.email,
          residentialAddress: data.residential_address,
          parentGuardianName: data.parent_guardian_name,
          parentGuardianPhone: data.parent_guardian_phone,
          emergencyContact: data.emergency_contact,
          profileImageUrl: data.profile_image_url,
          labels: data.labels || [],
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase updateStudent failed, updating local file:', err);
    }
  }

  let updatedStudent: Student | null = null;
  await saveLocalDatabase((state) => {
    const idx = state.students.findIndex((s) => s.id === id);
    if (idx !== -1) {
      state.students[idx] = {
        ...state.students[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      updatedStudent = state.students[idx];
    }
  });

  return updatedStudent;
}

// ==========================================
// Student Labels
// ==========================================
export async function getStudentLabels(): Promise<StudentLabel[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('student_labels').select('*');
      if (!error && data) {
        return data.map((l: any) => ({
          id: l.id,
          name: l.name,
          color: l.color,
          description: l.description,
          createdAt: l.created_at,
        }));
      }
    } catch (err) {}
  }
  const db = await getLocalDatabase();
  return db.studentLabels || [];
}

export async function createStudentLabel(label: Omit<StudentLabel, 'id' | 'createdAt'>): Promise<StudentLabel> {
  const newLabel: StudentLabel = {
    id: `label-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...label,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('student_labels').insert({
        id: newLabel.id,
        name: newLabel.name,
        color: newLabel.color,
        description: newLabel.description,
        created_at: newLabel.createdAt,
      });
    } catch (err) {}
  }

  await saveLocalDatabase((state) => {
    if (!state.studentLabels) state.studentLabels = [];
    state.studentLabels.push(newLabel);
  });

  return newLabel;
}

// ==========================================
// Admins
// ==========================================
export async function getAdmins(): Promise<AdminUser[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('admins').select('*');
      if (!error && data) {
        return data.map((a: any) => ({
          id: a.id,
          username: a.username,
          email: a.email,
          name: a.name,
          role: a.role,
          representativeCourse: a.representative_course,
          representativeRole: a.representative_role,
          permissions: a.permissions || [],
          isActive: a.is_active,
          createdAt: a.created_at,
          lastLoginAt: a.last_login_at,
        }));
      }
    } catch (err) {}
  }
  const db = await getLocalDatabase();
  return (db.admins || []).map((a: any) => ({
    id: a.id,
    username: a.username,
    email: a.email,
    name: a.name,
    role: a.role,
    representativeCourse: a.representativeCourse,
    representativeRole: a.representativeRole,
    permissions: a.permissions || [],
    isActive: a.isActive,
    createdAt: a.createdAt,
    lastLoginAt: a.lastLoginAt,
  }));
}

export async function getAdminByUsername(username: string): Promise<(AdminUser & { passwordHash: string }) | null> {
  const cleanUsername = username.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('admins').select('*').ilike('username', cleanUsername).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          username: data.username,
          email: data.email,
          name: data.name,
          role: data.role,
          representativeCourse: data.representative_course,
          representativeRole: data.representative_role,
          permissions: data.permissions || [],
          isActive: data.is_active,
          createdAt: data.created_at,
          lastLoginAt: data.last_login_at,
          passwordHash: data.password_hash,
        };
      }
    } catch (err) {}
  }

  const db = await getLocalDatabase();
  const local = (db.admins || []).find((a) => a.username?.toLowerCase() === cleanUsername);
  return local || null;
}

export async function updateAdminPermissions(id: string, permissions: string[]): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('admins').update({ permissions }).eq('id', id);
    } catch (err) {}
  }

  await saveLocalDatabase((state) => {
    const admin = (state.admins || []).find((a) => a.id === id);
    if (admin) {
      admin.permissions = permissions;
    }
  });

  return true;
}

// ==========================================
// Modules
// ==========================================
export async function getModules(): Promise<CourseModule[]> {
  const db = await getLocalDatabase();
  return db.modules || [];
}

// ==========================================
// Attendance
// ==========================================
export async function getAttendanceSessions(): Promise<AttendanceSession[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('attendance_sessions').select('*').order('date', { ascending: false });
      if (!error && data) {
        return data.map((s: any) => ({
          id: s.id,
          date: s.date,
          course: s.course,
          moduleId: s.module_id,
          moduleCode: s.module_code,
          moduleTitle: s.module_title,
          sessionType: s.session_type,
          startTime: s.start_time,
          endTime: s.end_time,
          totalStudents: s.total_students,
          presentCount: s.present_count,
          absentCount: s.absent_count,
          markedByAdminId: s.marked_by_admin_id,
          markedByAdminName: s.marked_by_admin_name,
          notes: s.notes,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));
      }
    } catch (err) {}
  }

  const db = await getLocalDatabase();
  return db.attendanceSessions || [];
}

export async function getAttendanceSessionById(id: string): Promise<{ session: AttendanceSession; records: AttendanceRecord[] } | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.from('attendance_sessions').select('*').eq('id', id).maybeSingle();
      if (sessionData) {
        const { data: recordsData } = await supabase.from('attendance_records').select('*').eq('session_id', id);
        return {
          session: {
            id: sessionData.id,
            date: sessionData.date,
            course: sessionData.course,
            moduleId: sessionData.module_id,
            moduleCode: sessionData.module_code,
            moduleTitle: sessionData.module_title,
            sessionType: sessionData.session_type,
            startTime: sessionData.start_time,
            endTime: sessionData.end_time,
            totalStudents: sessionData.total_students,
            presentCount: sessionData.present_count,
            absentCount: sessionData.absent_count,
            markedByAdminId: sessionData.marked_by_admin_id,
            markedByAdminName: sessionData.marked_by_admin_name,
            notes: sessionData.notes,
            createdAt: sessionData.created_at,
            updatedAt: sessionData.updated_at,
          },
          records: (recordsData || []).map((r: any) => ({
            id: r.id,
            sessionId: r.session_id,
            studentId: r.student_id,
            studentNumber: r.student_number,
            studentName: r.student_name,
            course: r.course,
            status: r.status,
            remarks: r.remarks,
            markedAt: r.marked_at,
            updatedAt: r.updated_at,
          })),
        };
      }
    } catch (err) {}
  }

  const db = await getLocalDatabase();
  const session = (db.attendanceSessions || []).find((s) => s.id === id);
  if (!session) return null;
  const records = (db.attendanceRecords || []).filter((r) => r.sessionId === id);
  return { session, records };
}

export async function saveAttendanceSession(
  sessionData: Omit<AttendanceSession, 'id' | 'createdAt' | 'updatedAt'>,
  records: Array<{ studentId: string; studentNumber: string; studentName: string; course: CourseType; status: 'present' | 'absent' | 'excused'; remarks?: string }>
): Promise<AttendanceSession> {
  const sessionId = `att-sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const session: AttendanceSession = {
    ...sessionData,
    id: sessionId,
    createdAt: now,
    updatedAt: now,
  };

  const newRecords: AttendanceRecord[] = records.map((r, i) => ({
    id: `att-rec-${Date.now()}-${i}`,
    sessionId,
    studentId: r.studentId,
    studentNumber: r.studentNumber,
    studentName: r.studentName,
    course: r.course,
    status: r.status,
    remarks: r.remarks,
    markedAt: now,
    updatedAt: now,
  }));

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('attendance_sessions').insert({
        id: session.id,
        date: session.date,
        course: session.course,
        module_id: session.moduleId,
        module_code: session.moduleCode,
        module_title: session.moduleTitle,
        session_type: session.sessionType,
        start_time: session.startTime,
        end_time: session.endTime,
        total_students: session.totalStudents,
        present_count: session.presentCount,
        absent_count: session.absentCount,
        marked_by_admin_id: session.markedByAdminId,
        marked_by_admin_name: session.markedByAdminName,
        notes: session.notes,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      });

      const dbRecords = newRecords.map((r) => ({
        id: r.id,
        session_id: r.sessionId,
        student_id: r.studentId,
        student_number: r.studentNumber,
        student_name: r.studentName,
        course: r.course,
        status: r.status,
        remarks: r.remarks,
        marked_at: r.markedAt,
        updated_at: r.updatedAt,
      }));
      await supabase.from('attendance_records').insert(dbRecords);
    } catch (err) {
      console.warn('Supabase saveAttendance failed, saving locally:', err);
    }
  }

  await saveLocalDatabase((state) => {
    if (!state.attendanceSessions) state.attendanceSessions = [];
    if (!state.attendanceRecords) state.attendanceRecords = [];
    state.attendanceSessions.unshift(session);
    state.attendanceRecords.push(...newRecords);
  });

  return session;
}

export async function deleteAttendanceSession(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('attendance_records').delete().eq('session_id', id);
      await supabase.from('attendance_sessions').delete().eq('id', id);
    } catch (err) {}
  }

  await saveLocalDatabase((state) => {
    state.attendanceSessions = (state.attendanceSessions || []).filter((s) => s.id !== id);
    state.attendanceRecords = (state.attendanceRecords || []).filter((r) => r.sessionId !== id);
  });

  return true;
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('attendance_records').select('*');
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          sessionId: r.session_id,
          studentId: r.student_id,
          studentNumber: r.student_number,
          studentName: r.student_name,
          course: r.course,
          status: r.status,
          remarks: r.remarks,
          markedAt: r.marked_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch (err) {}
  }

  const db = await getLocalDatabase();
  return db.attendanceRecords || [];
}

// ==========================================
// Timetables & Overrides
// ==========================================
export async function getTimetables(): Promise<Timetable[]> {
  const db = await getLocalDatabase();
  return db.timetables || [];
}

export async function getTimetableOverrides(): Promise<TimetableOverride[]> {
  const db = await getLocalDatabase();
  return db.timetableOverrides || [];
}

export async function saveTimetableOverride(override: Omit<TimetableOverride, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimetableOverride> {
  const id = `override-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const newOverride: TimetableOverride = {
    ...override,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const db = await saveLocalDatabase((state) => {
    if (!state.timetableOverrides) state.timetableOverrides = [];
    state.timetableOverrides.push(newOverride);
  });

  return newOverride;
}

export async function deleteTimetableOverride(id: string): Promise<boolean> {
  await saveLocalDatabase((state) => {
    state.timetableOverrides = (state.timetableOverrides || []).filter((o) => o.id !== id);
  });
  return true;
}

// ==========================================
// Assignments
// ==========================================
export async function getAssignments(): Promise<Assignment[]> {
  const db = await getLocalDatabase();
  return db.assignments || [];
}

export async function createAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assignment> {
  const id = `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const newAssignment: Assignment = {
    ...assignment,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await saveLocalDatabase((state) => {
    if (!state.assignments) state.assignments = [];
    state.assignments.unshift(newAssignment);
  });

  return newAssignment;
}

export async function updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | null> {
  let updated: Assignment | null = null;
  await saveLocalDatabase((state) => {
    const idx = (state.assignments || []).findIndex((a) => a.id === id);
    if (idx !== -1) {
      state.assignments[idx] = {
        ...state.assignments[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      updated = state.assignments[idx];
    }
  });
  return updated;
}

export async function deleteAssignment(id: string): Promise<boolean> {
  await saveLocalDatabase((state) => {
    state.assignments = (state.assignments || []).filter((a) => a.id !== id);
  });
  return true;
}

// ==========================================
// Full System Backup Snapshot
// ==========================================
export async function generateFullSystemBackup(): Promise<{
  timestamp: string;
  counts: Record<string, number>;
  snapshot: DatabaseState;
}> {
  const db = await getLocalDatabase();
  // Sanitize password hashes out of admin accounts for safety
  const sanitizedAdmins = (db.admins || []).map((a: any) => {
    const { passwordHash, ...rest } = a;
    return rest;
  });

  const snapshot: DatabaseState = {
    ...db,
    admins: sanitizedAdmins as any,
  };

  return {
    timestamp: new Date().toISOString(),
    counts: {
      students: snapshot.students?.length || 0,
      labels: snapshot.studentLabels?.length || 0,
      admins: snapshot.admins?.length || 0,
      attendanceSessions: snapshot.attendanceSessions?.length || 0,
      attendanceRecords: snapshot.attendanceRecords?.length || 0,
      timetables: snapshot.timetables?.length || 0,
      overrides: snapshot.timetableOverrides?.length || 0,
      assignments: snapshot.assignments?.length || 0,
      modules: snapshot.modules?.length || 0,
    },
    snapshot,
  };
}

// ==========================================
// Division Chat & Clearing
// ==========================================
export async function getChatMessages(): Promise<any[]> {
  const db = await getLocalDatabase();
  return db.chatMessages || [];
}

export async function addChatMessage(msg: any): Promise<any> {
  const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const newMsg = {
    ...msg,
    id,
    timestamp,
    createdAt: now.toISOString(),
  };

  await saveLocalDatabase((state) => {
    if (!state.chatMessages) state.chatMessages = [];
    state.chatMessages.push(newMsg);
  });

  return newMsg;
}

export async function clearChatMessages(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('chat_messages').delete().neq('id', 'dummy');
    } catch (err) {
      console.warn('Supabase clear chat failed:', err);
    }
  }

  await saveLocalDatabase((state) => {
    state.chatMessages = [];
  });
  return true;
}

// ==========================================
// Student Task Submissions
// ==========================================
export async function getTaskSubmissions(taskId?: string, studentId?: string): Promise<any[]> {
  const db = await getLocalDatabase();
  let subs = db.taskSubmissions || [];
  if (taskId) subs = subs.filter((s: any) => s.taskId === taskId);
  if (studentId) subs = subs.filter((s: any) => s.studentId === studentId || s.studentNumber === studentId);
  return subs;
}

export async function createTaskSubmission(submission: any): Promise<any> {
  const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newSub = {
    ...submission,
    id,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
  };

  await saveLocalDatabase((state) => {
    if (!state.taskSubmissions) state.taskSubmissions = [];
    state.taskSubmissions.unshift(newSub);
  });

  return newSub;
}

// ==========================================
// Student Invitations & Account Activation
// ==========================================
export async function getStudentInvitations(): Promise<any[]> {
  const db = await getLocalDatabase();
  return db.invitations || [];
}

export async function createStudentInvitation(inv: any): Promise<any> {
  const id = `inv-${Date.now()}`;
  const newInvite = {
    ...inv,
    id,
    isUsed: false,
    createdAt: new Date().toISOString(),
  };

  await saveLocalDatabase((state) => {
    if (!state.invitations) state.invitations = [];
    state.invitations.unshift(newInvite);
  });

  return newInvite;
}

export async function validateAndConsumeInvitation(code: string, studentNumber: string): Promise<boolean> {
  let success = false;
  const cleanCode = code.trim().toUpperCase();
  const cleanNum = studentNumber.trim().toUpperCase();

  // Also support default intake voucher codes if not present
  const defaultGeneralCodes = ['UCR-B11-TPOPT-INTAKE', 'UCR-B11-TPRPT-INTAKE', 'UCR-B11-INTAKE'];
  if (defaultGeneralCodes.includes(cleanCode)) {
    return true;
  }

  await saveLocalDatabase((state) => {
    if (!state.invitations) state.invitations = [];
    const inv = state.invitations.find((i: any) => i.code?.toUpperCase() === cleanCode);
    if (inv) {
      // Check expiration if present
      if (inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now()) {
        return;
      }

      // If code is bound to a specific student index, verify match
      if (inv.studentNumber && inv.studentNumber.trim().toUpperCase() !== cleanNum) {
        return;
      }

      const isGeneral = Boolean(inv.isGeneral || inv.code?.includes('INTAKE'));
      if (!isGeneral && inv.isUsed) {
        return; // Already used single-use voucher
      }

      if (!isGeneral) {
        inv.isUsed = true;
      }
      inv.usedAt = new Date().toISOString();
      inv.usedByStudentNumber = studentNumber;
      success = true;
    }
  });
  return success;
}

export async function deleteStudentInvitation(id: string): Promise<boolean> {
  await saveLocalDatabase((state) => {
    if (state.invitations) {
      state.invitations = state.invitations.filter((i: any) => i.id !== id);
    }
  });
  return true;
}

// ==========================================
// Locked Student Profile Update
// ==========================================
export async function updateStudentEditableDetails(
  studentIdentifier: string,
  allowedUpdates: {
    phoneNumber?: string;
    email?: string;
    residentialAddress?: string;
    parentGuardianName?: string;
    parentGuardianPhone?: string;
    emergencyContact?: string;
    profileImageUrl?: string;
    notes?: string;
    passwordHash?: string;
    isActivated?: boolean;
    activatedAt?: string;
  }
): Promise<Student | null> {
  let updated: Student | null = null;

  await saveLocalDatabase((state) => {
    const student = (state.students || []).find(
      (s) => s.id === studentIdentifier || s.studentNumber === studentIdentifier
    );
    if (student) {
      // STRICTLY PRESERVE LOCKED FIELDS:
      // studentNumber, course, and original fullName remain immutable
      if (allowedUpdates.phoneNumber !== undefined) student.phoneNumber = allowedUpdates.phoneNumber;
      if (allowedUpdates.email !== undefined) student.email = allowedUpdates.email;
      if (allowedUpdates.residentialAddress !== undefined) student.residentialAddress = allowedUpdates.residentialAddress;
      if (allowedUpdates.parentGuardianName !== undefined) student.parentGuardianName = allowedUpdates.parentGuardianName;
      if (allowedUpdates.parentGuardianPhone !== undefined) student.parentGuardianPhone = allowedUpdates.parentGuardianPhone;
      if (allowedUpdates.emergencyContact !== undefined) student.emergencyContact = allowedUpdates.emergencyContact;
      if (allowedUpdates.profileImageUrl !== undefined) student.profileImageUrl = allowedUpdates.profileImageUrl;
      if (allowedUpdates.notes !== undefined) student.notes = allowedUpdates.notes;
      if (allowedUpdates.passwordHash !== undefined) (student as any).passwordHash = allowedUpdates.passwordHash;
      if (allowedUpdates.isActivated !== undefined) (student as any).isActivated = allowedUpdates.isActivated;
      if (allowedUpdates.activatedAt !== undefined) (student as any).activatedAt = allowedUpdates.activatedAt;
      student.updatedAt = new Date().toISOString();
      updated = student;
    }
  });

  const supabase = getSupabaseAdmin();
  if (supabase && updated) {
    try {
      const supaUpdates: Record<string, any> = {};
      if (allowedUpdates.phoneNumber !== undefined) supaUpdates.phone_number = allowedUpdates.phoneNumber;
      if (allowedUpdates.email !== undefined) supaUpdates.email = allowedUpdates.email;
      if (allowedUpdates.residentialAddress !== undefined) supaUpdates.residential_address = allowedUpdates.residentialAddress;
      if (allowedUpdates.parentGuardianName !== undefined) supaUpdates.parent_guardian_name = allowedUpdates.parentGuardianName;
      if (allowedUpdates.parentGuardianPhone !== undefined) supaUpdates.parent_guardian_phone = allowedUpdates.parentGuardianPhone;
      if (allowedUpdates.emergencyContact !== undefined) supaUpdates.emergency_contact = allowedUpdates.emergencyContact;
      if (allowedUpdates.profileImageUrl !== undefined) supaUpdates.profile_image_url = allowedUpdates.profileImageUrl;
      if (allowedUpdates.notes !== undefined) supaUpdates.notes = allowedUpdates.notes;
      if (allowedUpdates.passwordHash !== undefined) supaUpdates.password_hash = allowedUpdates.passwordHash;
      if (allowedUpdates.isActivated !== undefined) supaUpdates.is_activated = allowedUpdates.isActivated;
      if (allowedUpdates.activatedAt !== undefined) supaUpdates.activated_at = allowedUpdates.activatedAt;
      supaUpdates.updated_at = new Date().toISOString();

      await supabase.from('students').update(supaUpdates).eq('id', (updated as any).id);
    } catch (supaErr) {
      console.warn('Supabase updateStudentEditableDetails failed:', supaErr);
    }
  }

  return updated;
}

