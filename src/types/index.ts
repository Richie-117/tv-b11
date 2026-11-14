export type CourseType = 'TPOPT' | 'TPRPT';
export type AdminRole = 'superadmin' | 'representative' | 'student';

export interface AdminPermission {
  code: string;
  name: string;
  description: string;
}

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  { code: 'students:read', name: 'View Students', description: 'Search and inspect student records' },
  { code: 'students:write', name: 'Edit Students', description: 'Update student profiles and label assignments' },
  { code: 'attendance:read', name: 'View Attendance', description: 'View attendance records and analytics' },
  { code: 'attendance:write', name: 'Mark Attendance', description: 'Record, edit, and correct student attendance' },
  { code: 'timetables:write', name: 'Manage Timetables', description: 'Postpone, reschedule, or cancel lectures' },
  { code: 'assignments:write', name: 'Manage Assignments', description: 'Create and publish assignment announcements' },
  { code: 'chat:moderate', name: 'Moderate Chat', description: 'Clear messages, remove posts and manage division feed' },
  { code: 'tools:pdf', name: 'PDF Generator', description: 'Generate printable lists and documents' },
  { code: 'backups:manage', name: 'Backups & Recovery', description: 'Create, inspect, and restore disaster backups' },
  { code: 'admins:manage', name: 'Manage Admins', description: 'Invite, suspend, and configure representative permissions' },
];

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  representativeCourse?: CourseType;
  representativeRole?: string; // 'Male Representative' | 'Female Representative'
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface StudentLabel {
  id: string;
  name: string;
  color: string; // e.g. '#FF7900', '#0088FF', '#10B981', '#8B5CF6'
  description?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  fullName: string;
  studentNumber: string; // RT/TPOPT/26/XX or RT/TPRPT/26/XX (Locked)
  course: CourseType;    // TPOPT or TPRPT (Locked)
  batch: string;         // "Batch 11 — 2026"
  gender?: 'Male' | 'Female';
  isRepresentative: boolean;
  representativeRole?: string;
  phoneNumber?: string;
  email?: string;
  residentialAddress?: string;
  parentGuardianName?: string;
  parentGuardianPhone?: string;
  emergencyContact?: string;
  profileImageUrl?: string;
  labels: string[]; // Label IDs
  notes?: string;
  passwordHash?: string;
  isActivated?: boolean;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance
export type AttendanceStatus = 'present' | 'absent' | 'excused';

export type AttendanceSessionStatus = 'held' | 'cancelled' | 'postponed' | 'rescheduled' | 'not_held';

export interface AttendanceSession {
  id: string;
  date: string; // "YYYY-MM-DD"
  course: CourseType | 'ALL';
  moduleId: string;
  moduleCode?: string;
  moduleTitle: string;
  sessionType: 'lecture' | 'practical' | 'workshop' | 'other';
  sessionStatus?: AttendanceSessionStatus;
  checkinStatus?: 'closed' | 'active' | 'expired';
  checkinOpenedAt?: string;
  checkinExpiresAt?: string;
  stage?: 'Foundation' | 'Level 5' | 'Level 6' | string;
  semester?: string;
  startTime?: string;
  endTime?: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  excusedCount?: number;
  markedByAdminId: string;
  markedByAdminName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CheckinStatus = 'submitted' | 'withdrawn' | 'confirmed';

export interface AttendanceCheckin {
  id: string;
  sessionId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  course: CourseType;
  status: CheckinStatus;
  submittedAt: string;
  withdrawnAt?: string;
  confirmedAt?: string;
  confirmedByAdminId?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  course: CourseType;
  status: AttendanceStatus;
  date?: string;
  remarks?: string;
  markedAt: string;
  updatedAt: string;
  updatedByAdminId?: string;
}

// Calendar & Timetables
export type SlotType = 'class' | 'break' | 'lunch' | 'empty';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type OverrideStatus = 'POSTPONED' | 'UNAVAILABLE';

export interface TimetableSlot {
  id: string;
  timetableId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "08:30"
  endTime: string;   // "09:30"
  timeLabel?: string;
  subject: string;
  studentGroup?: string;
  slotType: SlotType;
  room?: string;
  notes?: string;
  sortOrder: number;
}

export interface Timetable {
  id: string;
  category: 'foundation' | 'academic_1' | 'academic_2';
  course: CourseType;
  title: string;
  subtitle: string;
  batchLabel: string;
  pdfUrl?: string;
  isPublished: boolean;
  slots: TimetableSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface TimetableOverride {
  id: string;
  timetableId?: string;
  timetableSlotId?: string;
  course?: CourseType;
  exceptionDate: string; // "YYYY-MM-DD"
  status: OverrideStatus;
  reason?: string;
  rescheduledDate?: string;
  rescheduledStartTime?: string;
  rescheduledEndTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

// Assignments & Deliverables
export type AssignmentPriority = 'normal' | 'important' | 'urgent';
export type AssignmentStatus = 'active' | 'postponed' | 'completed' | 'cancelled';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course: CourseType | 'ALL';
  moduleId?: string;
  moduleTitle?: string;
  issueDate: string; // YYYY-MM-DD
  deadline: string;  // ISO timestamp or YYYY-MM-DD HH:MM
  priority: AssignmentPriority;
  status: AssignmentStatus;
  externalLinks?: { title: string; url: string }[];
  attachments?: { title: string; url: string; size?: number }[];
  createdByAdminId: string;
  createdByAdminName: string;
  createdAt: string;
  updatedAt: string;
}

// Student Task Submissions
export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  course: CourseType;
  remarks?: string;
  submissionUrl?: string;
  fileName?: string;
  fileSize?: string;
  mentionedInChat?: boolean;
  submittedAt: string;
  status: 'submitted' | 'reviewed' | 'graded';
}

// Division Chat Messages
export interface ChatAttachment {
  type: 'image' | 'document';
  url: string;
  name: string;
  size?: string;
}

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  course?: string;
  isSelf?: boolean;
  text: string;
  attachment?: ChatAttachment;
  taskMention?: {
    taskId: string;
    taskTitle: string;
  };
  timestamp: string;
  createdAt: string;
}

// Student Invitations & Account Activation
export interface StudentInvitation {
  id: string;
  code: string;
  course: CourseType | 'ALL';
  studentNumber?: string;
  studentName?: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  usedByStudentNumber?: string;
  createdAt: string;
}

// Academic Modules
export interface CourseModule {
  id: string;
  code?: string;
  title: string;
  description: string;
  courseCodes: CourseType[];
  learningStageId?: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  thumbnailUrl?: string;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mobile Navigation Customization
export interface NavTabItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: string | number;
  superAdminOnly?: boolean;
  defaultVisible: boolean;
}

export const ADMIN_NAV_TABS: NavTabItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin', iconName: 'LayoutDashboard', defaultVisible: true },
  { id: 'students', label: 'Students', href: '/admin/students', iconName: 'Users', defaultVisible: true },
  { id: 'attendance', label: 'Attendance', href: '/admin/attendance', iconName: 'CheckSquare', defaultVisible: true },
  { id: 'timetable', label: 'Timetable', href: '/admin/timetable', iconName: 'Calendar', defaultVisible: true },
  { id: 'tools', label: 'PDF Tools', href: '/admin/tools', iconName: 'FileText', defaultVisible: true },
  { id: 'assignments', label: 'Assignments', href: '/admin/assignments', iconName: 'BookOpen', defaultVisible: false },
  { id: 'chat', label: 'Division Chat', href: '/admin/chat', iconName: 'MessageSquare', defaultVisible: false },
  { id: 'invitations', label: 'Student Invites', href: '/admin/invitations', iconName: 'KeyRound', superAdminOnly: true, defaultVisible: false },
  { id: 'admins', label: 'Rep Management', href: '/admin/representatives', iconName: 'ShieldCheck', superAdminOnly: true, defaultVisible: false },
  { id: 'backups', label: 'Backups', href: '/admin/backups', iconName: 'HardDrive', superAdminOnly: true, defaultVisible: false },
];
