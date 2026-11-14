'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckSquare,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  FileDown,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Phone,
  Copy,
  Check,
  Search,
  Eye,
  X,
  Save,
  Radio,
  Smartphone,
  Send,
  CheckCheck,
  RefreshCw,
} from 'lucide-react';
import { AttendanceSession, AttendanceRecord, AttendanceCheckin, CourseModule, Student, CourseType } from '@/types';
import { generateStudentsPDF, generateSessionAttendancePDF, DEFAULT_DOCUMENT_OPTIONS } from '@/lib/pdfGenerator';
import { calculateAttendanceRate, isSessionValid, TRACKING_START_DATE } from '@/lib/attendanceCalculations';
import { getCached, setCached } from '@/lib/portalCache';

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'marking'
    ? 'marking'
    : searchParams.get('mode') === 'absentees'
    ? 'absentees'
    : 'dashboard';
  const initialCourse = (searchParams.get('course') as CourseType) || 'TPOPT';

  const cachedAtt = getCached<any>('admin_attendance_data');
  const cachedStudents = getCached<Student[]>('admin_students_list');

  const [sessions, setSessions] = useState<AttendanceSession[]>(() => cachedAtt?.sessions || []);
  const [records, setRecords] = useState<AttendanceRecord[]>(() => cachedAtt?.records || []);
  const [checkins, setCheckins] = useState<AttendanceCheckin[]>(() => cachedAtt?.checkins || []);
  const [students, setStudents] = useState<Student[]>(() => cachedStudents || []);
  const [isLoading, setIsLoading] = useState(() => !cachedAtt);

  // Push Check-in Modal state
  const [checkinModalSession, setCheckinModalSession] = useState<AttendanceSession | null>(null);
  const [checkinDuration, setCheckinDuration] = useState<number>(30);
  const [isPushingCheckin, setIsPushingCheckin] = useState(false);
  const [isConfirmingCheckin, setIsConfirmingCheckin] = useState<string | null>(null);
  const [checkinFeedback, setCheckinFeedback] = useState<string | null>(null);

  // View Mode: 'dashboard' | 'marking' | 'absentees'
  const [viewMode, setViewMode] = useState<'dashboard' | 'marking' | 'absentees'>(initialMode);

  // Filter state for dashboard & absentees
  const [filterCourse, setFilterCourse] = useState<string>('ALL');
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterStudentId, setFilterStudentId] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [absentSearch, setAbsentSearch] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Session details modal state
  const [selectedDetailSession, setSelectedDetailSession] = useState<AttendanceSession | null>(null);
  const [detailStudentSearch, setDetailStudentSearch] = useState<string>('');
  const [detailRecordsMap, setDetailRecordsMap] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [isExportingSession, setIsExportingSession] = useState(false);

  // Marking session form state
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [markCourse, setMarkCourse] = useState<CourseType | 'ALL'>(initialCourse);
  const [markModuleId, setMarkModuleId] = useState<string>('sub-ict');
  const [markSessionType, setMarkSessionType] = useState<'lecture' | 'practical' | 'workshop' | 'other'>('practical');
  const [markNotes, setMarkNotes] = useState<string>('');
  const [recordsMap, setRecordsMap] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Live Check-in for Marking session
  const [liveCheckinSessionId, setLiveCheckinSessionId] = useState<string | null>(null);
  const [liveCheckinActive, setLiveCheckinActive] = useState<boolean>(false);
  const [checkedInStudentIds, setCheckedInStudentIds] = useState<Set<string>>(new Set());

  // Live Timetable Sync state
  const [liveTimetableData, setLiveTimetableData] = useState<any>(null);
  const [liveSyncedSlot, setLiveSyncedSlot] = useState<any>(null);
  const [allTimetables, setAllTimetables] = useState<any[]>([]);
  const [selectedTimetableSlotId, setSelectedTimetableSlotId] = useState<string | null>(null);
  const [syncedBanner, setSyncedBanner] = useState<{
    subject: string;
    timeRange: string;
    isLive: boolean;
  } | null>(null);
  const [markStartTime, setMarkStartTime] = useState<string>('');
  const [markEndTime, setMarkEndTime] = useState<string>('');

  // Real Timetable Academic Subjects (replacing previous dummy pillars)
  const academicModules = useMemo(
    () => [
      { id: 'sub-english', code: 'ENGLISH', title: 'English', course: 'ALL' },
      { id: 'sub-dm7', code: 'DM7', title: 'DM7', course: 'ALL' },
      { id: 'sub-dm10', code: 'DM10', title: 'DM10', course: 'ALL' },
      { id: 'sub-ict', code: 'ICT', title: 'ICT', course: 'ALL' },
      { id: 'sub-gaffer', code: 'GAFFER', title: 'Gaffer', course: 'ALL' },
      { id: 'sub-maths', code: 'MATHS', title: 'Maths', course: 'ALL' },
      { id: 'sub-drawing', code: 'ENG-DRAW', title: 'Engineering Drawing', course: 'ALL' },
      { id: 'sub-physics', code: 'NVQ-PHYS', title: 'NVQ Physics I,II', course: 'ALL' },
      { id: 'sub-graphic', code: 'CGD', title: 'Computer Graphic Designer', course: 'ALL' },
      { id: 'sub-osh', code: 'OSH', title: 'OSH', course: 'ALL' },
    ],
    []
  );

  // Day of the week for markDate
  const currentDayName = useMemo(() => {
    try {
      if (!markDate) return 'Friday';
      const [y, m, d] = markDate.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[dt.getUTCDay()];
    } catch {
      return 'Friday';
    }
  }, [markDate]);

  // Extract all available lectures for the selected date & course from the timetable
  const availableTimetableLectures = useMemo(() => {
    if (!allTimetables || allTimetables.length === 0) return [];

    const timetables =
      markCourse === 'ALL'
        ? allTimetables
        : allTimetables.filter((t) => t.course === markCourse);

    const consolidated: Array<{
      id: string;
      subject: string;
      startTime: string;
      endTime: string;
      timeLabel: string;
      mappedModuleId: string;
      mappedModuleCode: string;
      mappedModuleTitle: string;
      sessionType: 'lecture' | 'practical' | 'workshop' | 'other';
      isLiveNow: boolean;
      room?: string;
    }> = [];

    // Collect all slots for current day
    const allSlots: any[] = [];
    timetables.forEach((timetable) => {
      if (timetable.slots) {
        timetable.slots
          .filter(
            (s: any) =>
              s.dayOfWeek.toLowerCase() === currentDayName.toLowerCase() &&
              s.slotType === 'class' &&
              Boolean(s.subject?.trim())
          )
          .forEach((slot: any) => {
            const exists = allSlots.some(
              (ex) =>
                ex.subject.toLowerCase() === slot.subject.toLowerCase() &&
                ex.startTime === slot.startTime
            );
            if (!exists) {
              allSlots.push(slot);
            }
          });
      }
    });

    allSlots.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    allSlots.forEach((slot: any) => {
      const last = consolidated[consolidated.length - 1];
      if (last && last.subject === slot.subject && last.endTime === slot.startTime) {
        last.endTime = slot.endTime;
        last.timeLabel = `${last.startTime} – ${slot.endTime}`;
      } else {
        const subjTrimmed = (slot.subject || '').trim();
        const subjLower = subjTrimmed.toLowerCase();
        let matched = academicModules.find(
          (m) =>
            subjLower === m.title.toLowerCase() ||
            subjLower === m.code.toLowerCase() ||
            subjLower.includes(m.title.toLowerCase()) ||
            m.title.toLowerCase().includes(subjLower) ||
            (subjLower.includes('draw') && m.id === 'sub-drawing') ||
            (subjLower.includes('physic') && m.id === 'sub-physics')
        );

        let mappedId = matched ? matched.id : `sub-${subjLower.replace(/[^a-z0-9]/g, '-')}`;
        let mappedCode = matched ? matched.code : subjTrimmed.toUpperCase();
        let mappedTitle = matched ? matched.title : subjTrimmed;
        let sessType: 'lecture' | 'practical' | 'workshop' | 'other' = 'practical';

        if (subjLower.includes('draw') || subjLower.includes('math') || subjLower.includes('english')) {
          sessType = 'lecture';
        }

        const isLive = Boolean(
          liveSyncedSlot &&
            liveSyncedSlot.subject &&
            (liveSyncedSlot.subject.toLowerCase().includes(slot.subject.toLowerCase()) ||
              slot.subject.toLowerCase().includes(liveSyncedSlot.subject.toLowerCase()))
        );

        consolidated.push({
          id: slot.id,
          subject: slot.subject,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeLabel: slot.timeLabel || `${slot.startTime} – ${slot.endTime}`,
          mappedModuleId: mappedId,
          mappedModuleCode: mappedCode,
          mappedModuleTitle: mappedTitle,
          sessionType: sessType,
          isLiveNow: isLive,
          room: slot.room,
        });
      }
    });

    return consolidated;
  }, [allTimetables, markDate, markCourse, liveSyncedSlot, currentDayName, academicModules]);

  const handleSelectTimetableLecture = (lec: any) => {
    setSelectedTimetableSlotId(lec.id);
    setMarkModuleId(lec.mappedModuleId);
    setMarkSessionType(lec.sessionType);
    setMarkStartTime(lec.startTime);
    setMarkEndTime(lec.endTime);
    setSyncedBanner({
      subject: lec.subject,
      timeRange: lec.timeLabel,
      isLive: lec.isLiveNow,
    });
  };

  const syncModuleWithLiveLecture = (targetCourse: CourseType | 'ALL', liveData: any) => {
    if (!liveData) return;
    const activeStatus =
      targetCourse === 'TPRPT'
        ? liveData.tprpt
        : targetCourse === 'TPOPT'
        ? liveData.tpopt
        : liveData.tpopt?.currentSlot
        ? liveData.tpopt
        : liveData.tprpt;
    const slot = activeStatus?.currentSlot || activeStatus?.nextSlot;
    if (slot && slot.subject) {
      setLiveSyncedSlot(slot);
      const s = slot.subject.toLowerCase();
      const matched = academicModules.find(
        (m) =>
          s.includes(m.title.toLowerCase()) ||
          s.includes(m.code.toLowerCase()) ||
          m.title.toLowerCase().includes(s) ||
          (s.includes('draw') && m.id === 'sub-drawing') ||
          (s.includes('physic') && m.id === 'sub-physics')
      );
      if (matched) {
        setMarkModuleId(matched.id);
      }
      setSyncedBanner({
        subject: slot.subject,
        timeRange: slot.timeRange || 'Live Lecture Slot',
        isLive: Boolean(activeStatus?.currentSlot),
      });
    } else {
      setLiveSyncedSlot(null);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [sessRes, stdRes, ttRes] = await Promise.all([
        fetch('/api/admin/attendance'),
        fetch('/api/admin/students'),
        fetch('/api/admin/timetable'),
      ]);

      if (sessRes.ok) {
        const d = await sessRes.json();
        setSessions(d.sessions || []);
        setRecords(d.records || []);
        setCheckins(d.checkins || []);
        setCached('admin_attendance_data', {
          sessions: d.sessions || [],
          records: d.records || [],
          checkins: d.checkins || [],
        });
      }

      if (stdRes.ok) {
        const d = await stdRes.json();
        setStudents(d.students || []);
        setCached('admin_students_list', d.students || []);
      }

      if (ttRes.ok) {
        const ttData = await ttRes.json();
        setLiveTimetableData(ttData.liveStatus);
        setAllTimetables(ttData.timetables || []);
        syncModuleWithLiveLecture(markCourse, ttData.liveStatus);
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCourseChange = (newCourse: CourseType | 'ALL') => {
    setMarkCourse(newCourse);
    if (newCourse !== 'ALL') {
      syncModuleWithLiveLecture(newCourse, liveTimetableData);
    } else {
      if (liveTimetableData?.currentSlot) {
        setSyncedBanner({
          subject: liveTimetableData.currentSlot.subject,
          timeRange: `${liveTimetableData.currentSlot.startTime} - ${liveTimetableData.currentSlot.endTime}`,
          isLive: true,
        });
      }
    }
  };

  // Students eligible for current marking session
  const eligibleStudents = useMemo(() => {
    if (markCourse === 'ALL') return students;
    return students.filter((s) => s.course === markCourse);
  }, [students, markCourse]);

  // Poll for active live check-in sessions while in marking mode
  const pollActiveCheckins = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/attendance/checkin/push?course=${markCourse}&date=${markDate}`);
      if (res.ok) {
        const d = await res.json();
        if (d.hasActiveSession && d.session) {
          setLiveCheckinActive(true);
          setLiveCheckinSessionId(d.session.id);
          const ids = new Set<string>(d.checkedInStudentIds || []);
          setCheckedInStudentIds(ids);

          // Automatically mark checked-in students as present in the roll-call list
          if (ids.size > 0) {
            setRecordsMap((prev) => {
              const updated = { ...prev };
              ids.forEach((id) => {
                updated[id] = 'present';
              });
              return updated;
            });
          }
        } else {
          setLiveCheckinActive(false);
          setLiveCheckinSessionId(null);
        }
      }
    } catch (e) {}
  }, [markCourse, markDate]);

  useEffect(() => {
    if (viewMode !== 'marking') return;

    pollActiveCheckins();
    // Gentle 10s interval to prevent log spamming while keeping real-time sync active
    const interval = setInterval(pollActiveCheckins, 10000);
    return () => clearInterval(interval);
  }, [viewMode, pollActiveCheckins]);

  // Initialize attendance records when eligible students change (default absent unless checked in)
  useEffect(() => {
    setRecordsMap((prev) => {
      const initial: Record<string, 'present' | 'absent' | 'excused'> = {};
      eligibleStudents.forEach((s) => {
        initial[s.id] = prev[s.id] || (checkedInStudentIds.has(s.id) ? 'present' : 'absent');
      });
      return initial;
    });
  }, [eligibleStudents, checkedInStudentIds]);

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'present' | 'absent' | 'excused'> = {};
    eligibleStudents.forEach((s) => {
      updated[s.id] = 'present';
    });
    setRecordsMap(updated);
  };

  const handleMarkAllAbsent = () => {
    const updated: Record<string, 'present' | 'absent' | 'excused'> = {};
    eligibleStudents.forEach((s) => {
      updated[s.id] = 'absent';
    });
    setRecordsMap(updated);
  };

  const toggleStudentStatus = (studentId: string) => {
    setRecordsMap((prev) => {
      const current = prev[studentId] || 'absent';
      const next = current === 'absent' ? 'present' : current === 'present' ? 'excused' : 'absent';
      return { ...prev, [studentId]: next };
    });
  };

  const handlePushLiveCheckin = async () => {
    const targetModule = academicModules.find((m) => m.id === markModuleId);
    const selectedSlot = availableTimetableLectures.find(
      (l) => l.id === selectedTimetableSlotId || `tt-${l.id}` === markModuleId
    );

    const moduleId = selectedSlot ? selectedSlot.mappedModuleId : targetModule?.id || 'sub-ict';
    const moduleCode = selectedSlot ? selectedSlot.mappedModuleCode : targetModule?.code || 'ICT';
    const moduleTitle = selectedSlot ? selectedSlot.mappedModuleTitle : targetModule?.title || 'Academic Lecture';

    setIsPushingCheckin(true);
    try {
      const res = await fetch('/api/admin/attendance/checkin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          durationMinutes: 45,
          date: markDate,
          course: markCourse,
          moduleId,
          moduleCode,
          moduleTitle,
          sessionType: markSessionType,
          startTime: markStartTime || selectedSlot?.startTime || '08:30',
          endTime: markEndTime || selectedSlot?.endTime || '16:30',
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setLiveCheckinActive(true);
        setLiveCheckinSessionId(d.session.id);
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === d.session.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = d.session;
            return copy;
          }
          return [d.session, ...prev];
        });
        alert(`Check-in is now live on student dashboards for ${moduleTitle}! Students who tap Check-In will automatically be marked Present.`);
      } else {
        alert(d.error || 'Failed to start check-in.');
      }
    } catch (e: any) {
      alert(e.message || 'Error activating check-in.');
    } finally {
      setIsPushingCheckin(false);
    }
  };

  const handleCloseLiveCheckin = async () => {
    if (!liveCheckinSessionId) return;
    setIsPushingCheckin(true);
    try {
      const res = await fetch('/api/admin/attendance/checkin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: liveCheckinSessionId,
          action: 'close',
        }),
      });
      if (res.ok) {
        setLiveCheckinActive(false);
        alert('Check-in window closed.');
      }
    } catch (e) {} finally {
      setIsPushingCheckin(false);
    }
  };

  const handleSaveAttendance = async () => {
    const targetModule = academicModules.find((m) => m.id === markModuleId);
    const selectedSlot = availableTimetableLectures.find(
      (l) => l.id === selectedTimetableSlotId || `tt-${l.id}` === markModuleId
    );

    const moduleId = selectedSlot ? selectedSlot.mappedModuleId : targetModule?.id;
    const moduleCode = selectedSlot ? selectedSlot.mappedModuleCode : targetModule?.code;
    const moduleTitle = selectedSlot ? selectedSlot.mappedModuleTitle : targetModule?.title;

    if (!moduleId || !moduleTitle) {
      alert('Please select an academic module or timetable lecture.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMessage(null);

    const recordsPayload = eligibleStudents.map((s) => ({
      studentId: s.id,
      studentNumber: s.studentNumber,
      studentName: s.fullName,
      course: s.course,
      status: recordsMap[s.id] || 'absent',
    }));

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: liveCheckinSessionId || undefined,
          date: markDate,
          course: markCourse,
          moduleId,
          moduleCode,
          moduleTitle,
          sessionType: markSessionType,
          startTime: markStartTime || selectedSlot?.startTime,
          endTime: markEndTime || selectedSlot?.endTime,
          notes: markNotes,
          records: recordsPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessions((prev) => [data.session, ...prev.filter((s) => s.id !== data.session.id)]);
        setLiveCheckinActive(false);
        setLiveCheckinSessionId(null);
        setCheckedInStudentIds(new Set());
        fetchInitialData();
        setSaveSuccessMessage('Attendance recorded and audited successfully!');
        setTimeout(() => {
          setViewMode('dashboard');
          setSaveSuccessMessage(null);
        }, 1400);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save attendance.');
      }
    } catch (err) {
      alert('Error connecting to server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushCheckin = async (
    sessionId: string,
    action: 'open' | 'close',
    durationMinutes = 30
  ) => {
    setIsPushingCheckin(true);
    setCheckinFeedback(null);
    try {
      const res = await fetch('/api/admin/attendance/checkin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, durationMinutes }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, ...data.session } : s))
        );
        if (checkinModalSession && checkinModalSession.id === sessionId) {
          setCheckinModalSession((prev) => (prev ? { ...prev, ...data.session } : null));
        }
        setCheckinFeedback(data.message || 'Check-in status updated.');
        fetchInitialData();
        setTimeout(() => setCheckinFeedback(null), 3000);
      } else {
        alert(data.error || 'Failed to update check-in.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error updating check-in.');
    } finally {
      setIsPushingCheckin(false);
    }
  };

  const handleConfirmCheckin = async (
    sessionId: string,
    studentId?: string,
    confirmAll = false
  ) => {
    setIsConfirmingCheckin(studentId || 'all');
    try {
      const res = await fetch('/api/admin/attendance/checkin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId, confirmAll }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.session) {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, ...data.session } : s))
          );
          if (selectedDetailSession && selectedDetailSession.id === sessionId) {
            setSelectedDetailSession((prev) => (prev ? { ...prev, ...data.session } : null));
          }
        }
        if (data.checkins) {
          setCheckins(data.checkins);
        }
        if (confirmAll) {
          const sessCheckins = checkins.filter(
            (c) => c.sessionId === sessionId && c.status === 'submitted'
          );
          setDetailRecordsMap((prev) => {
            const copy = { ...prev };
            sessCheckins.forEach((c) => {
              copy[c.studentId] = 'present';
            });
            return copy;
          });
        } else if (studentId) {
          setDetailRecordsMap((prev) => ({ ...prev, [studentId]: 'present' }));
        }

        setRecords((prev) => {
          const targetIds = new Set(
            confirmAll
              ? checkins.filter((c) => c.sessionId === sessionId && c.status === 'submitted').map((c) => c.studentId)
              : [studentId]
          );
          return prev.map((r) => {
            if (r.sessionId === sessionId && targetIds.has(r.studentId)) {
              return { ...r, status: 'present' };
            }
            return r;
          });
        });

        setCheckinFeedback(data.message || 'Check-in confirmed.');
        setTimeout(() => setCheckinFeedback(null), 2500);
      } else {
        alert(data.error || 'Failed to confirm check-in.');
      }
    } catch (err: any) {
      alert(err.message || 'Error confirming check-in.');
    } finally {
      setIsConfirmingCheckin(null);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      const res = await fetch(`/api/admin/attendance?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e) {
      alert('Failed to delete session.');
    }
  };

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 1800);
  };

  // Export Attendance PDF
  const handleExportPDF = async () => {
    try {
      const pdf = await generateStudentsPDF(students, {
        ...DEFAULT_DOCUMENT_OPTIONS,
        headline: 'OFFICIAL ATTENDANCE SHEET',
        subtitle: `Course: ${filterCourse} · Academic Session Log`,
        format: 'attendance',
        emptyColumnTitle: 'Signature / Remarks',
      });
      pdf.save(`UCR_Attendance_${filterCourse}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  // Export Module-Separated Excel Workbook
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const params = new URLSearchParams();
      if (filterCourse !== 'ALL') params.set('course', filterCourse);
      if (filterModule !== 'ALL') params.set('moduleId', filterModule);
      if (viewMode === 'absentees') {
        params.set('absenteesOnly', 'true');
        if (filterDate) {
          params.set('startDate', filterDate);
          params.set('endDate', filterDate);
        }
      }
      const res = await fetch(`/api/admin/attendance/export/excel?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to download Excel file');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UCR_Batch11_Attendance_${filterCourse}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error exporting Excel file.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Dashboard filtering
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterCourse !== 'ALL' && s.course !== filterCourse && s.course !== 'ALL') return false;
      if (filterModule !== 'ALL' && s.moduleId !== filterModule && s.moduleCode !== filterModule) return false;
      return true;
    });
  }, [sessions, filterCourse, filterModule]);

  // Selected Student if filtering by student
  const selectedStudent = useMemo(() => {
    if (filterStudentId === 'ALL') return null;
    return students.find((s) => s.id === filterStudentId);
  }, [students, filterStudentId]);

  // Aggregate metrics using authoritative shared calculation
  let totalSessionsCount = filteredSessions.length;
  let presentSum = 0;
  let absentSum = 0;
  let validSessionsCount = 0;

  if (selectedStudent) {
    // Show stats specifically for this student
    const studentCourseSessions = filteredSessions.filter(
      (s) => s.course === 'ALL' || s.course === selectedStudent.course
    );
    totalSessionsCount = studentCourseSessions.length;
    studentCourseSessions.forEach((s) => {
      if (isSessionValid(s)) {
        validSessionsCount++;
        const rec = records.find(
          (r) =>
            r.sessionId === s.id &&
            (r.studentId === selectedStudent.id ||
              r.studentNumber?.toUpperCase() === selectedStudent.studentNumber?.toUpperCase())
        );
        if (rec?.status === 'present') presentSum++;
        else if (rec?.status === 'absent') absentSum++;
      }
    });
  } else {
    // Overall batch metrics
    filteredSessions.forEach((s) => {
      if (isSessionValid(s)) {
        validSessionsCount++;
        presentSum += s.presentCount || 0;
        absentSum += s.absentCount || 0;
      }
    });
  }

  const rateResult = calculateAttendanceRate(presentSum, absentSum);
  const avgRate = rateResult.rate !== null ? rateResult.rate : 0;
  const formattedRate = rateResult.formattedRate;

  // Absentees calculation: ONLY students who were ACTUALLY marked absent!
  const absenteesList = useMemo(() => {
    if (sessions.length === 0 || records.length === 0) return [];

    const targetSessions = sessions.filter((s) => {
      if (filterDate && s.date !== filterDate) return false;
      if (filterCourse !== 'ALL' && s.course !== filterCourse && s.course !== 'ALL') return false;
      return true;
    });

    const targetSessionIds = new Set(targetSessions.map((s) => s.id));
    const sessionMap = new Map(targetSessions.map((s) => [s.id, s]));
    const studentMap = new Map(students.map((st) => [st.id, st]));

    const list: any[] = [];
    records.forEach((rec) => {
      if (rec.status === 'absent' && targetSessionIds.has(rec.sessionId)) {
        const sess = sessionMap.get(rec.sessionId);
        const st = studentMap.get(rec.studentId) || students.find((s) => s.studentNumber === rec.studentNumber);

        if (filterCourse !== 'ALL' && rec.course !== filterCourse) return;

        if (absentSearch.trim()) {
          const q = absentSearch.toLowerCase();
          const nameMatch = (st?.fullName || rec.studentName || '').toLowerCase().includes(q);
          const indexMatch = (st?.studentNumber || rec.studentNumber || '').toLowerCase().includes(q);
          if (!nameMatch && !indexMatch) return;
        }

        list.push({
          id: `${rec.sessionId}-${rec.studentId}`,
          sessionId: rec.sessionId,
          sessionDate: sess?.date || rec.date || '',
          moduleTitle: sess?.moduleTitle || 'Academic Lecture',
          moduleCode: sess?.moduleCode || '',
          studentId: rec.studentId,
          studentNumber: st?.studentNumber || rec.studentNumber,
          fullName: st?.fullName || rec.studentName,
          course: rec.course,
          phoneNumber: st?.phoneNumber,
          parentPhone: st?.parentGuardianPhone,
          remarks: rec.remarks || '',
        });
      }
    });

    return list;
  }, [sessions, records, students, filterDate, filterCourse, absentSearch]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
            <div className="w-9 h-9 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span>Attendance Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time roll-call, timetable lecture synchronization, and absentee rosters
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <a
            href="/check-in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF7900]/15 hover:bg-[#FF7900]/25 text-[#FF7900] hover:text-[#FFA040] border border-[#FF7900]/40 text-xs font-bold touch-target transition-colors shadow-sm shadow-[#FF7900]/10"
            title="Open public check-in terminal for students in new tab"
          >
            <Radio className="w-4 h-4 text-[#FF7900] animate-pulse" />
            <span>Check-In Tab</span>
          </a>
          <button
            type="button"
            disabled={isExportingExcel}
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0088FF]/10 hover:bg-[#0088FF]/20 text-[#38BDF8] hover:text-white border border-[#0088FF]/30 text-xs font-bold touch-target transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0088FF]" />
            <span>{isExportingExcel ? 'Preparing Excel...' : 'Export Excel'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold touch-target transition-colors"
          >
            <FileDown className="w-4 h-4 text-[#0088FF]" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs (Dashboard, Mark New Session, Absentee Roster Filter) */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-[#111827] border border-[#1E293B]">
        <button
          type="button"
          onClick={() => setViewMode('dashboard')}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'dashboard'
              ? 'bg-[#1E293B] text-white shadow border border-[#334155]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#0088FF]" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('marking')}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'marking'
              ? 'bg-[#FF7900] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Mark Live Session</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('absentees')}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'absentees'
              ? 'bg-[#0088FF] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Absentee Filters</span>
        </button>
      </div>

      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MARK LIVE SESSION VIEW (WITH TIMETABLE SYNC)                            */}
      {/* ========================================================================= */}
      {viewMode === 'marking' && (
        <div className="space-y-4">
          {/* Live Sync Banner */}
          {syncedBanner ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0088FF]/20 to-[#FF7900]/20 border border-[#0088FF]/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-[#38BDF8] flex-shrink-0" />
                <span>
                  <strong>⚡ Timetable Synced:</strong> {syncedBanner.subject} ({syncedBanner.timeRange}) · Programme: <strong>{markCourse === 'ALL' ? 'Both (Common)' : markCourse}</strong>
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0088FF] text-white font-mono text-[10px] font-bold self-start sm:self-auto">
                {syncedBanner.isLive ? '● Live Now' : '✓ Synced with Timetable'}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#1E293B] border border-[#334155] text-xs text-slate-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Select any available lecture from the timetable below or choose a curriculum module.</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{currentDayName} Schedule</span>
            </div>
          )}

          {/* Session Parameters Card */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF7900]" />
                <span>Session Parameters</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">Batch 11 — 2026</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Session Date ({currentDayName})
                </label>
                <input
                  type="date"
                  value={markDate}
                  onChange={(e) => setMarkDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#FF7900] touch-target"
                />
              </div>

              {/* Course Programme Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Target Programme
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCourseChange('TPOPT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all touch-target text-center ${
                      markCourse === 'TPOPT'
                        ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/20'
                        : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
                    }`}
                  >
                    TPOPT (26)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCourseChange('TPRPT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all touch-target text-center ${
                      markCourse === 'TPRPT'
                        ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
                        : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
                    }`}
                  >
                    TPRPT (22)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCourseChange('ALL')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all touch-target text-center ${
                      markCourse === 'ALL'
                        ? 'bg-gradient-to-r from-[#FF7900] to-[#0088FF] text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20'
                        : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
                    }`}
                  >
                    Both (48)
                  </button>
                </div>
              </div>

              {/* Session Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Session Type
                </label>
                <select
                  value={markSessionType}
                  onChange={(e) => setMarkSessionType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#FF7900] touch-target"
                >
                  <option value="lecture">Classroom Lecture</option>
                  <option value="practical">Practical / Lab Session</option>
                  <option value="workshop">Studio Workshop</option>
                  <option value="other">Review / Seminar</option>
                </select>
              </div>
            </div>

            {/* Available Timetable Lectures Quick Selector */}
            {availableTimetableLectures.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#FF7900]" />
                    <span>Available Timetable Lectures ({currentDayName} — {markCourse === 'ALL' ? 'Both Programmes' : markCourse}):</span>
                  </span>
                  <span className="text-[10px] text-[#38BDF8]">Tap any lecture to auto-sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableTimetableLectures.map((lec) => {
                    const isSelected = selectedTimetableSlotId === lec.id;
                    return (
                      <button
                        key={lec.id}
                        type="button"
                        onClick={() => handleSelectTimetableLecture(lec)}
                        className={`text-left p-3 rounded-xl border transition-all touch-target ${
                          isSelected
                            ? 'bg-[#FF7900]/20 border-[#FF7900] text-white shadow-md shadow-[#FF7900]/20 ring-1 ring-[#FF7900]'
                            : 'bg-[#111827] border-[#1E293B] text-slate-300 hover:border-slate-500 hover:bg-[#1E293B]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-black text-white truncate">{lec.subject}</span>
                          {lec.isLiveNow ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                              ● Live Now
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">{lec.timeLabel}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{lec.mappedModuleTitle}</div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="capitalize">{lec.sessionType}</span>
                          {isSelected ? (
                            <span className="text-[#FF7900] font-bold">✓ Synced</span>
                          ) : (
                            <span className="text-[#0088FF] text-[10px]">Select & Sync</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Academic Module Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Academic Module (Auto-Matched or Manual)
              </label>
              <select
                value={selectedTimetableSlotId ? `tt-${selectedTimetableSlotId}` : markModuleId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('tt-')) {
                    const foundLec = availableTimetableLectures.find((l) => `tt-${l.id}` === val);
                    if (foundLec) handleSelectTimetableLecture(foundLec);
                  } else {
                    setMarkModuleId(val);
                    setSelectedTimetableSlotId(null);
                    setSyncedBanner(null);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#FF7900] touch-target font-semibold"
              >
                {availableTimetableLectures.length > 0 && (
                  <optgroup label={`📅 Available Lectures from Timetable (${currentDayName} — ${markCourse === 'ALL' ? 'Both Programmes' : markCourse})`}>
                    {availableTimetableLectures.map((l) => (
                      <option key={l.id} value={`tt-${l.id}`}>
                        ★ [Timetable] {l.subject} ({l.timeLabel}) — {l.mappedModuleCode}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📚 Standard Academic Curriculum Modules">
                  {academicModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Live Student Mobile Check-In Broadcast Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#161F30] via-[#1E293B] to-[#161F30] border border-[#23324A] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {liveCheckinActive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      STUDENT CHECK-IN LIVE
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-[#FF7900]" />
                      <span>Student Mobile Check-In:</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-300 font-medium">
                    {liveCheckinActive
                      ? `${checkedInStudentIds.size} student${checkedInStudentIds.size === 1 ? '' : 's'} checked in via mobile (auto-marked present)`
                      : 'Push this lecture to student dashboards so students can self check-in.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {liveCheckinActive ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => pollActiveCheckins()}
                      className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#2A3B52] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-all flex items-center gap-1.5 touch-target shadow-sm active:scale-95"
                      title="Sync student mobile check-ins immediately"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>Sync</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPushingCheckin}
                      onClick={handleCloseLiveCheckin}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all touch-target"
                    >
                      Close Check-In Window
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPushingCheckin}
                    onClick={handlePushLiveCheckin}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-black shadow-lg shadow-[#FF7900]/25 transition-all active:scale-95 touch-target"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Push to Check-In</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Rapid Thumb Roll-Call Controls */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{eligibleStudents.length} Students in Roster</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all touch-target"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={handleMarkAllAbsent}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all touch-target"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Student Roll-Call List */}
          <div className="space-y-2">
            {eligibleStudents.map((s, index) => {
              const status = recordsMap[s.id] || 'absent';
              const isMobileCheckedIn = checkedInStudentIds.has(s.id);

              return (
                <div
                  key={s.id}
                  onClick={() => toggleStudentStatus(s.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none touch-target ${
                    status === 'present'
                      ? 'bg-[#111827] border-emerald-500/40 hover:border-emerald-500'
                      : status === 'absent'
                      ? 'bg-[#111827] border-rose-500/40 hover:border-rose-500'
                      : 'bg-[#111827] border-amber-500/40 hover:border-amber-500'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-mono text-slate-500 flex-shrink-0">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>

                    {/* Student Photo Thumbnail */}
                    {s.profileImageUrl ? (
                      <img
                        src={s.profileImageUrl}
                        alt={s.fullName}
                        className="w-9 h-9 rounded-xl object-cover border border-[#23324A] flex-shrink-0 shadow"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#161F30] border border-[#23324A] text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {s.fullName ? s.fullName.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">{s.studentNumber}</span>
                        {isMobileCheckedIn && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 animate-in fade-in">
                            <Smartphone className="w-3 h-3 text-emerald-400" />
                            Checked In
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white truncate">{s.fullName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all ${
                        status === 'present'
                          ? 'bg-emerald-500 text-white'
                          : status === 'absent'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {status === 'present' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {status === 'absent' && <XCircle className="w-3.5 h-3.5" />}
                      {status === 'excused' && <HelpCircle className="w-3.5 h-3.5" />}
                      <span>{status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Save Footer */}
          <div className="sticky bottom-20 md:bottom-4 bg-[#111827]/95 backdrop-blur-xl border border-[#1E293B] rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-emerald-400">
                Present: {Object.values(recordsMap).filter((v) => v === 'present').length}
              </span>
              <span className="text-rose-400">
                Absent: {Object.values(recordsMap).filter((v) => v === 'absent').length}
              </span>
              <span className="text-amber-400">
                Excused: {Object.values(recordsMap).filter((v) => v === 'excused').length}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-[#1E293B] touch-target"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-black shadow-lg shadow-[#FF7900]/25 active:scale-95 disabled:opacity-50 touch-target"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Attendance...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Save Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABSENTEE ROSTER & FILTER VIEW                                          */}
      {/* ========================================================================= */}
      {viewMode === 'absentees' && (
        <div className="space-y-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0088FF]" />
                  <span>Absentee Roster Filter</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect who was absent on any selected date or week to follow up directly
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black">
                  {absenteesList.length} Absent Records
                </span>
              </div>
            </div>

            {/* Filter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Filter by Programme
                </label>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#0088FF]"
                >
                  <option value="ALL">All Programmes</option>
                  <option value="TPOPT">TPOPT (Post Production)</option>
                  <option value="TPRPT">TPRPT (Studio Production)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Search Student Name or ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={absentSearch}
                    onChange={(e) => setAbsentSearch(e.target.value)}
                    placeholder="Search absent student..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Absentee Roster Cards */}
          <div className="space-y-2.5">
            {absenteesList.length === 0 ? (
              <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Absentees Recorded for this Filter</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Either all students were present or no sessions were logged for this date.
                </p>
              </div>
            ) : (
              absenteesList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ABSENT
                      </span>
                      <span className="font-mono text-xs font-bold text-[#FF7900]">
                        {item.studentNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        · {item.course} · {item.sessionDate}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{item.fullName}</h4>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Missed: {item.moduleTitle}
                    </div>
                  </div>

                  {/* Immediate Contact Actions for Reps */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {item.phoneNumber ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${item.phoneNumber}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0088FF]/15 hover:bg-[#0088FF]/25 border border-[#0088FF]/30 text-[#38BDF8] text-xs font-bold transition-all"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{item.phoneNumber}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyPhone(item.phoneNumber, item.id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                          title="Copy phone"
                        >
                          {copyFeedback === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No phone recorded</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DASHBOARD & HISTORY VIEW                                               */}
      {/* ========================================================================= */}
      {viewMode === 'dashboard' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3.5 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Sessions</div>
              <div className="text-2xl font-black text-white mt-1">{totalSessionsCount}</div>
            </div>

            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3.5 shadow-sm">
              <div className="text-[10px] font-bold text-emerald-400 uppercase">Average Attendance</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{formattedRate}</div>
            </div>

            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3.5 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Students Present</div>
              <div className="text-2xl font-black text-white mt-1">{presentSum}</div>
            </div>

            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3.5 shadow-sm">
              <div className="text-[10px] font-bold text-rose-400 uppercase">Students Absent</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{absentSum}</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#FF7900]" />
                <span>Filters:</span>
              </span>

              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#FF7900] touch-target"
              >
                <option value="ALL">All Programmes</option>
                <option value="TPOPT">TPOPT Only</option>
                <option value="TPRPT">TPRPT Only</option>
              </select>

              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#FF7900] touch-target"
              >
                <option value="ALL">All Subjects</option>
                {academicModules.map((m) => (
                  <option key={m.id} value={m.code}>
                    [{m.code}] {m.title}
                  </option>
                ))}
              </select>

              {/* Student Filter Dropdown (Dashboard) */}
              <select
                value={filterStudentId}
                onChange={(e) => setFilterStudentId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#0088FF] touch-target max-w-[220px]"
              >
                <option value="ALL">All Students (Batch 11)</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.studentNumber} · {st.fullName} ({st.course})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              {filteredSessions.length} sessions logged
              {selectedStudent && (
                <span className="ml-1 text-[#0088FF]">
                  · Filtered for: <strong>{selectedStudent.fullName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Recorded Sessions List */}
          <div className="space-y-3">
            {filteredSessions.length === 0 ? (
              <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1E293B] text-slate-400 flex items-center justify-center mx-auto">
                  <CheckSquare className="w-6 h-6 text-[#0088FF]" />
                </div>
                <h3 className="text-sm font-bold text-white">No Attendance Sessions Logged Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Start tracking attendance for Batch 11 by tapping the &quot;Mark Live Session&quot; tab above.
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode('marking')}
                  className="px-5 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/20"
                >
                  Mark First Session
                </button>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const total = (session.presentCount || 0) + (session.absentCount || 0);
                const percent = total > 0 ? Math.round(((session.presentCount || 0) / total) * 100) : 0;

                return (
                  <div
                    key={session.id}
                    className="bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] rounded-2xl p-4 shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-bold text-[#FF7900] bg-[#FF7900]/15 px-2 py-0.5 rounded border border-[#FF7900]/30">
                            {session.date}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                              session.course === 'TPOPT'
                                ? 'bg-[#FF7900]/20 text-[#FF7900] border-[#FF7900]/30'
                                : session.course === 'TPRPT'
                                ? 'bg-[#0088FF]/20 text-[#0088FF] border-[#0088FF]/30'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {session.course}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-[#1E293B]">
                            {session.sessionType}
                          </span>

                          {/* Check-in status badge */}
                          {session.checkinStatus === 'active' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Check-in Live
                            </span>
                          ) : session.checkinStatus === 'closed' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1E293B] text-slate-400 border border-[#334155]">
                              Check-in Closed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#161F30] text-slate-500 border border-[#23324A]">
                              Check-in Off
                            </span>
                          )}

                          {(() => {
                            const sessCheckins = checkins.filter((c) => c.sessionId === session.id);
                            const pendingCount = sessCheckins.filter((c) => c.status === 'submitted').length;
                            if (pendingCount > 0) {
                              return (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/40 animate-pulse">
                                  {pendingCount} Pending Check-in{pendingCount > 1 ? 's' : ''}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <h3 className="text-sm font-bold text-white">
                          {session.moduleTitle} {session.moduleCode ? `[${session.moduleCode}]` : ''}
                        </h3>

                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>Recorded by {session.markedByAdminName}</span>
                          {session.notes && <span>· Note: {session.notes}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-base font-black text-emerald-400">{percent}%</div>
                          <div className="text-[10px] text-slate-400">
                            {session.presentCount} present · {session.absentCount} absent
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCheckinModalSession(session)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target active:scale-95 ${
                            session.checkinStatus === 'active'
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                              : 'bg-[#FF7900]/15 hover:bg-[#FF7900]/25 text-[#FF7900] border border-[#FF7900]/30'
                          }`}
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>{session.checkinStatus === 'active' ? 'Manage Check-in' : 'Push Check-in'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDetailSession(session);
                            const initial: Record<string, 'present' | 'absent' | 'excused'> = {};
                            const sessRecs = records.filter((r) => r.sessionId === session.id);
                            sessRecs.forEach((r) => {
                              initial[r.studentId] = r.status;
                            });
                            setDetailRecordsMap(initial);
                            setDetailStudentSearch('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0088FF]/15 hover:bg-[#0088FF]/25 text-[#38BDF8] border border-[#0088FF]/30 text-xs font-bold transition-colors touch-target"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>See Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Per-Student Status Indicator if Filtered */}
                    {selectedStudent && (
                      <div className="mt-3 pt-2.5 border-t border-[#1E293B] flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          Status for <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentNumber}):
                        </span>
                        {(() => {
                          const inCohort = session.course === 'ALL' || session.course === selectedStudent.course;
                          if (!inCohort) {
                            return <span className="text-slate-500 italic text-[11px]">Not enrolled in target cohort</span>;
                          }
                          const rec = records.find(
                            (r) =>
                              r.sessionId === session.id &&
                              (r.studentId === selectedStudent.id ||
                                r.studentNumber?.toUpperCase() === selectedStudent.studentNumber?.toUpperCase())
                          );
                          if (rec?.status === 'present') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PRESENT
                              </span>
                            );
                          } else if (rec?.status === 'absent') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" /> ABSENT
                              </span>
                            );
                          } else if (rec?.status === 'excused') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center gap-1">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> EXCUSED
                              </span>
                            );
                          }
                          return <span className="text-slate-500 italic text-[11px]">Unmarked</span>;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Session Details Modal (See Details -> Full Roster, Toggle, Export Session PDF & Excel) */}
      {selectedDetailSession && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1E293B] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#FF7900] bg-[#FF7900]/15 px-2 py-0.5 rounded border border-[#FF7900]/30">
                    {selectedDetailSession.date}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#0088FF]/20 text-[#0088FF] border border-[#0088FF]/30">
                    {selectedDetailSession.course}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-[#1E293B]">
                    {selectedDetailSession.sessionType}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                  {selectedDetailSession.moduleTitle} {selectedDetailSession.moduleCode ? `[${selectedDetailSession.moduleCode}]` : ''}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  Conducted by: <strong>{selectedDetailSession.markedByAdminName}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailSession(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1E293B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions Bar (Export PDF & Export Excel & Confirm Check-ins) */}
            <div className="px-4 sm:px-5 py-3 bg-[#161F30]/60 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">
                  {Object.values(detailRecordsMap).filter((v) => v === 'present').length} Present
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-bold text-rose-400">
                  {Object.values(detailRecordsMap).filter((v) => v === 'absent').length} Absent
                </span>
                {(() => {
                  const pendingCount = checkins.filter(
                    (c) => c.sessionId === selectedDetailSession.id && c.status === 'submitted'
                  ).length;
                  if (pendingCount > 0) {
                    return (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs font-bold text-[#FF7900] animate-pulse">
                          {pendingCount} Pending Check-in{pendingCount > 1 ? 's' : ''}
                        </span>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const pendingCount = checkins.filter(
                    (c) => c.sessionId === selectedDetailSession.id && c.status === 'submitted'
                  ).length;
                  if (pendingCount > 0) {
                    return (
                      <button
                        type="button"
                        disabled={isConfirmingCheckin === 'all'}
                        onClick={() => handleConfirmCheckin(selectedDetailSession.id, undefined, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/25 active:scale-95 touch-target disabled:opacity-50"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{isConfirmingCheckin === 'all' ? 'Confirming...' : `Confirm All (${pendingCount}) Pending`}</span>
                      </button>
                    );
                  }
                  return null;
                })()}
                <button
                  type="button"
                  disabled={isExportingSession}
                  onClick={async () => {
                    if (!selectedDetailSession) return;
                    setIsExportingSession(true);
                    try {
                      const res = await fetch(`/api/admin/attendance/export/excel?sessionId=${selectedDetailSession.id}`);
                      if (!res.ok) throw new Error('Failed to generate session spreadsheet');
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `UCR_${selectedDetailSession.course}_${selectedDetailSession.moduleCode || 'Session'}_${selectedDetailSession.date}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (e: any) {
                      alert(e.message || 'Error exporting session Excel');
                    } finally {
                      setIsExportingSession(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0088FF]/15 hover:bg-[#0088FF]/25 text-[#38BDF8] border border-[#0088FF]/30 text-xs font-bold transition-colors disabled:opacity-50 touch-target"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#0088FF]" />
                  <span>{isExportingSession ? 'Exporting...' : 'Export Session Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedDetailSession) return;
                    try {
                      const sessRecs = records.filter((r) => r.sessionId === selectedDetailSession.id);
                      const pdf = await generateSessionAttendancePDF(selectedDetailSession, sessRecs, students);
                      pdf.save(
                        `UCR_${selectedDetailSession.course}_${selectedDetailSession.moduleCode || 'Session'}_${selectedDetailSession.date}.pdf`
                      );
                    } catch (e: any) {
                      alert('Error exporting session PDF');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-colors touch-target"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#FF7900]" />
                  <span>Export Session PDF</span>
                </button>
              </div>
            </div>

            {/* Quick Student Search inside Modal */}
            <div className="p-3 bg-[#111827] border-b border-[#1E293B]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={detailStudentSearch}
                  onChange={(e) => setDetailStudentSearch(e.target.value)}
                  placeholder="Filter student in this session..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF]"
                />
              </div>
            </div>

            {/* Student List in Session */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(() => {
                const eligibleStudents = students.filter(
                  (s) => selectedDetailSession.course === 'ALL' || s.course === selectedDetailSession.course
                );
                const filtered = eligibleStudents.filter((s) => {
                  if (!detailStudentSearch.trim()) return true;
                  const q = detailStudentSearch.toLowerCase();
                  return s.fullName.toLowerCase().includes(q) || s.studentNumber.toLowerCase().includes(q);
                });

                return filtered.map((stu) => {
                  const currentStatus = detailRecordsMap[stu.id] || 'present';
                  const stuCheckin = checkins.find(
                    (c) => c.sessionId === selectedDetailSession.id && c.studentId === stu.id
                  );

                  return (
                    <div
                      key={stu.id}
                      className="p-3 rounded-xl bg-[#161F30] border border-[#23324A] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[11px] font-bold">{stu.studentNumber}</span>
                          {stuCheckin?.status === 'submitted' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/40 animate-pulse">
                              Pending Check-in
                            </span>
                          )}
                          {stuCheckin?.status === 'confirmed' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ Check-in Confirmed
                            </span>
                          )}
                        </div>
                        <div className="text-white font-bold mt-0.5">{stu.fullName}</div>
                        {stuCheckin?.status === 'submitted' && (
                          <div className="mt-1">
                            <button
                              type="button"
                              disabled={isConfirmingCheckin === stu.id}
                              onClick={() => handleConfirmCheckin(selectedDetailSession.id, stu.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow transition-all active:scale-95 touch-target"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isConfirmingCheckin === stu.id ? 'Confirming...' : 'Confirm Present'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailRecordsMap((prev) => ({ ...prev, [stu.id]: 'present' }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'present'
                              ? 'bg-emerald-500 text-white shadow'
                              : 'bg-[#1E293B] text-slate-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailRecordsMap((prev) => ({ ...prev, [stu.id]: 'absent' }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'absent'
                              ? 'bg-rose-500 text-white shadow'
                              : 'bg-[#1E293B] text-slate-400 hover:text-white'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailRecordsMap((prev) => ({ ...prev, [stu.id]: 'excused' }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'excused'
                              ? 'bg-amber-500 text-white shadow'
                              : 'bg-[#1E293B] text-slate-400 hover:text-white'
                          }`}
                        >
                          Excused
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer with Save Button */}
            <div className="p-4 border-t border-[#1E293B] bg-[#111827] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedDetailSession(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>

              <button
                type="button"
                disabled={isUpdatingSession}
                onClick={async () => {
                  if (!selectedDetailSession) return;
                  setIsUpdatingSession(true);
                  const eligibleStudents = students.filter(
                    (s) => selectedDetailSession.course === 'ALL' || s.course === selectedDetailSession.course
                  );
                  const recordsPayload = eligibleStudents.map((s) => ({
                    studentId: s.id,
                    studentNumber: s.studentNumber,
                    studentName: s.fullName,
                    course: s.course,
                    status: detailRecordsMap[s.id] || 'present',
                  }));

                  try {
                    const res = await fetch('/api/admin/attendance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        date: selectedDetailSession.date,
                        course: selectedDetailSession.course,
                        moduleId: selectedDetailSession.moduleId,
                        moduleCode: selectedDetailSession.moduleCode,
                        moduleTitle: selectedDetailSession.moduleTitle,
                        sessionType: selectedDetailSession.sessionType,
                        startTime: selectedDetailSession.startTime,
                        endTime: selectedDetailSession.endTime,
                        notes: selectedDetailSession.notes,
                        records: recordsPayload,
                      }),
                    });
                    if (res.ok) {
                      await fetchInitialData();
                      setSelectedDetailSession(null);
                    } else {
                      alert('Failed to update session.');
                    }
                  } catch (e) {
                    alert('Error saving changes.');
                  } finally {
                    setIsUpdatingSession(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0077E6] text-white text-xs font-bold shadow-lg shadow-[#0088FF]/20 flex items-center gap-1.5 touch-target disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isUpdatingSession ? 'Saving Changes...' : 'Save Updated Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Check-in Management Modal */}
      {checkinModalSession && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#111827] border border-[#1E293B] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Student Lecture Check-in</h3>
                  <p className="text-xs text-slate-400">Push real-time roll-call to students&apos; mobile/desktop devices</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckinModalSession(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session details */}
            <div className="p-3.5 rounded-2xl bg-[#161F30] border border-[#23324A] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{checkinModalSession.moduleTitle}</span>
                <span className="font-mono text-[11px] text-[#FF7900] font-bold">{checkinModalSession.course}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Date: {checkinModalSession.date} · Type: {checkinModalSession.sessionType}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-300">Current Status:</span>
                {checkinModalSession.checkinStatus === 'active' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active Check-in Live
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E293B] text-slate-400 border border-[#334155]">
                    Closed / Not Published
                  </span>
                )}
              </div>
              {checkinModalSession.checkinExpiresAt && checkinModalSession.checkinStatus === 'active' && (
                <div className="text-[11px] text-[#38BDF8]">
                  Window open until: {new Date(checkinModalSession.checkinExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Live counts */}
            {(() => {
              const sessCheckins = checkins.filter((c) => c.sessionId === checkinModalSession.id);
              const submittedCount = sessCheckins.filter((c) => c.status === 'submitted').length;
              const confirmedCount = sessCheckins.filter((c) => c.status === 'confirmed').length;
              const withdrawnCount = sessCheckins.filter((c) => c.status === 'withdrawn').length;

              return (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-center">
                    <div className="text-[10px] font-bold text-amber-400 uppercase">Submitted</div>
                    <div className="text-xl font-black text-white mt-0.5">{submittedCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-center">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase">Confirmed</div>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">{confirmedCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Withdrawn</div>
                    <div className="text-xl font-black text-slate-300 mt-0.5">{withdrawnCount}</div>
                  </div>
                </div>
              );
            })()}

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Check-in Window Duration (Minutes)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCheckinDuration(mins)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all touch-target ${
                      checkinDuration === mins
                        ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20 ring-1 ring-[#0088FF]'
                        : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            {checkinFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                {checkinFeedback}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1E293B]">
              {checkinModalSession.checkinStatus === 'active' ? (
                <button
                  type="button"
                  disabled={isPushingCheckin}
                  onClick={() => handlePushCheckin(checkinModalSession.id, 'close')}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all disabled:opacity-50 touch-target"
                >
                  {isPushingCheckin ? 'Closing...' : 'Close Check-in Window'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPushingCheckin}
                  onClick={() => handlePushCheckin(checkinModalSession.id, 'open', checkinDuration)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold transition-all shadow-lg shadow-[#FF7900]/25 active:scale-95 touch-target disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPushingCheckin ? 'Publishing...' : `Publish Check-in (${checkinDuration}m)`}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCheckinModalSession(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-all touch-target"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
