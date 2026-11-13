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
} from 'lucide-react';
import { CourseLiveLectureStatus, SriLankaTimeContext } from '@/lib/timetableService';

export default function StudentDashboardPage() {
  const [liveStatus, setLiveStatus] = useState<{
    tpopt?: CourseLiveLectureStatus;
    tprpt?: CourseLiveLectureStatus;
    context?: SriLankaTimeContext;
  } | null>(null);

  const [studentCourse, setStudentCourse] = useState<'TPOPT' | 'TPRPT'>('TPOPT');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalSessions: 0,
    presentCount: 0,
    absentCount: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    fetch('/api/admin/timetable')
      .then((r) => r.json())
      .then((d) => setLiveStatus(d.liveStatus || null))
      .catch(() => {});

    fetch('/api/admin/assignments')
      .then((r) => r.json())
      .then((d) => setAssignments(d.assignments || []))
      .catch(() => {});

    fetch('/api/student/attendance')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.stats) {
          setAttendanceStats(d.stats);
        }
      })
      .catch(() => {});
  }, []);

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
