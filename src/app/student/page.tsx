'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  BookOpen,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  PlayCircle,
  Bell,
  Search,
  CheckSquare,
  Upload,
  User,
  Radio,
  RotateCcw,
  Check,
} from 'lucide-react';
import { CourseLiveLectureStatus, SriLankaTimeContext } from '@/lib/timetableService';
import { getCached, setCached } from '@/lib/portalCache';

export default function StudentDashboardPage() {
  const [liveStatus, setLiveStatus] = useState<{
    tpopt?: CourseLiveLectureStatus;
    tprpt?: CourseLiveLectureStatus;
    context?: SriLankaTimeContext;
  } | null>(() => getCached('student_dashboard_live') || null);

  const [studentCourse, setStudentCourse] = useState<'TPOPT' | 'TPRPT'>('TPOPT');
  const [assignments, setAssignments] = useState<any[]>(() => getCached('student_dashboard_tasks') || []);
  const [attendanceStats, setAttendanceStats] = useState(() => {
    return (
      getCached<any>('student_dashboard_stats') || {
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        attendanceRate: 0,
      }
    );
  });

  // Check-in State
  const [checkinState, setCheckinState] = useState<{
    hasActiveCheckin: boolean;
    hasCheckedIn: boolean;
    session: any | null;
  }>(() => {
    return (
      getCached<any>('student_checkin_state') || {
        hasActiveCheckin: false,
        hasCheckedIn: false,
        session: null,
      }
    );
  });
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [checkinFeedback, setCheckinFeedback] = useState<string | null>(null);

  const fetchCheckinState = async () => {
    try {
      const res = await fetch('/api/student/checkin');
      if (res.ok) {
        const d = await res.json();
        setCheckinState({
          hasActiveCheckin: Boolean(d.hasActiveCheckin),
          hasCheckedIn: Boolean(d.hasCheckedIn),
          session: d.session || null,
        });
        setCached('student_checkin_state', d);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetch('/api/admin/timetable')
      .then((r) => r.json())
      .then((d) => {
        setLiveStatus(d.liveStatus || null);
        setCached('student_dashboard_live', d.liveStatus || null);
      })
      .catch(() => {});

    fetch('/api/admin/assignments')
      .then((r) => r.json())
      .then((d) => {
        setAssignments(d.assignments || []);
        setCached('student_dashboard_tasks', d.assignments || []);
      })
      .catch(() => {});

    fetch('/api/student/attendance')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.stats) {
          setAttendanceStats(d.stats);
          setCached('student_dashboard_stats', d.stats);
        }
      })
      .catch(() => {});

    fetchCheckinState();
    const interval = setInterval(fetchCheckinState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStudentCheckin = async () => {
    if (!checkinState.session?.id) return;
    setIsSubmittingCheckin(true);
    setCheckinFeedback(null);
    try {
      const res = await fetch('/api/student/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: checkinState.session.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinState((prev) => ({ ...prev, hasCheckedIn: true }));
        setCheckinFeedback(data.message || `Checked in successfully for ${checkinState.session.moduleTitle}!`);
        setTimeout(() => setCheckinFeedback(null), 4000);
      } else {
        alert(data.error || 'Failed to submit check-in.');
      }
    } catch (e: any) {
      alert(e.message || 'Error submitting check-in.');
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  const courseStatus = studentCourse === 'TPOPT' ? liveStatus?.tpopt : liveStatus?.tprpt;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs sm:text-sm font-semibold text-slate-400">
            {getGreeting()}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Student Space · Batch 11
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Division of Television Studies · University College of Rathmalana
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStudentCourse(studentCourse === 'TPOPT' ? 'TPRPT' : 'TPOPT')}
            className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155] text-xs font-bold text-white hover:border-[#0088FF] transition-all"
          >
            Stream: <strong className="text-[#FF7900]">{studentCourse}</strong> (Switch)
          </button>

          <Link
            href="/student/chat"
            className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white flex items-center justify-center transition-all relative"
            title="Division Chat notices"
          >
            <Bell className="w-4 h-4 text-[#0088FF]" />
            <span className="w-2 h-2 rounded-full bg-[#FF7900] absolute top-2 right-2" />
          </Link>
        </div>
      </div>

      {/* Real-time Lecture Roll-Call Check-in Card */}
      {checkinState.hasActiveCheckin && checkinState.session && (
        <div className="bg-gradient-to-r from-[#111827] via-[#161F30] to-[#111827] border-2 border-[#FF7900] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-in fade-in">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF7900]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  LIVE LECTURE CHECK-IN
                </span>
                <span className="font-mono text-xs font-bold text-[#FF7900] bg-[#FF7900]/15 px-2 py-0.5 rounded border border-[#FF7900]/30">
                  {checkinState.session.course}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {checkinState.session.date} · {checkinState.session.startTime} - {checkinState.session.endTime}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
                {checkinState.session.moduleTitle}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300">
                Roll-call check-in is active for this lecture. Tap Check-In to mark your attendance.
              </p>

              {checkinFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in">
                  {checkinFeedback}
                </div>
              )}
            </div>

            {/* Check-in Button / Disappears upon click */}
            <div className="flex items-center flex-shrink-0">
              {checkinState.hasCheckedIn ? (
                <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-black shadow-lg shadow-emerald-500/15 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Checked In · Present</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmittingCheckin}
                  onClick={handleStudentCheckin}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-base font-black shadow-xl shadow-[#FF7900]/30 transition-all active:scale-95 touch-target min-h-[48px] uppercase tracking-wider cursor-pointer"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>{isSubmittingCheckin ? 'Checking In...' : 'Check-In'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. FIRSTLY: Attendance Rate Hero Card (Starts at 0% when zero sessions recorded) */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#1E293B]"
                  strokeWidth="3.6"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#0088FF]"
                  strokeDasharray={`${attendanceStats.attendanceRate}, 100`}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-black text-white font-heading">
                  {attendanceStats.attendanceRate}%
                </span>
                <span className="block text-[9px] font-bold text-slate-400 uppercase">
                  Present
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0088FF]" />
                <h2 className="text-base font-bold text-white">My Attendance Standing</h2>
              </div>
              <p className="text-xs text-slate-400">
                {attendanceStats.totalSessions === 0
                  ? '0 Sessions Logged Yet · Records will start with first roll-call mark'
                  : `${attendanceStats.presentCount} of ${attendanceStats.totalSessions} scheduled lectures attended`}
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs">
                <span className="text-emerald-400 font-bold">Present: {attendanceStats.presentCount}</span>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400 font-bold">Absent: {attendanceStats.absentCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/student/attendance"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0072D6] text-white text-xs font-bold shadow-lg shadow-[#0088FF]/25 transition-all active:scale-95 touch-target"
            >
              <Calendar className="w-4 h-4" />
              <span>View Visualized Attendance Calendar</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Lecture Glance & Active Status */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF7900]" />
            <h3 className="text-sm font-bold text-white">Current Lecture Status ({studentCourse})</h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#38BDF8]">
            {liveStatus?.context?.displayTime || 'Asia/Colombo'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#161F30] border border-[#23324A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-black text-white">
                {courseStatus?.statusLabel || 'Regular Class Schedule'}
              </span>
            </div>

            {courseStatus?.currentSlot ? (
              <div className="text-xs text-slate-300">
                Subject: <strong className="text-white">{courseStatus.currentSlot.subject}</strong> ({courseStatus.currentSlot.timeRange})
                {courseStatus.currentSlot.room && ` · Studio / Lab: ${courseStatus.currentSlot.room}`}
              </div>
            ) : (
              <div className="text-xs text-slate-400">No active lecture slot in progress right now.</div>
            )}
          </div>

          {courseStatus?.nextSlot && (
            <div className="text-xs sm:text-right border-t sm:border-t-0 sm:border-l border-[#23324A] pt-2 sm:pt-0 sm:pl-4">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Upcoming Today:</span>
              <span className="font-bold text-white">{courseStatus.nextSlot.subject}</span>
              <span className="block text-[#FF7900] font-mono text-[11px]">{courseStatus.nextSlot.timeRange}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Deliverables & Division Chat Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Workspace Tasks */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#FF7900]" />
              <h3 className="text-sm font-bold text-white">Pending Tasks & Deadlines</h3>
            </div>
            <Link
              href="/student/workspace"
              className="text-xs font-bold text-[#0088FF] hover:underline flex items-center gap-0.5"
            >
              <span>Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No assignments published right now.</p>
            ) : (
              assignments.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{task.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      Due: {new Date(task.deadline).toLocaleDateString()} · {task.course}
                    </span>
                  </div>
                  <Link
                    href="/student/workspace"
                    className="px-3 py-1.5 rounded-lg bg-[#0088FF] hover:bg-[#0072D6] text-white text-xs font-bold shadow flex-shrink-0"
                  >
                    Submit
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Division Chat Fast Access */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0088FF]" />
                <h3 className="text-sm font-bold text-white">Division Chat Channel</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-400">Active</span>
            </div>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Official academic feed for Batch 11. Read lecturer announcements, coordinate project folders, and mention submissions.
            </p>
          </div>

          <Link
            href="/student/chat"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-white text-xs font-bold border border-[#334155] transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-[#0088FF]" />
            <span>Open Division Chat</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
