'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckSquare,
  Calendar,
  FileText,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  ShieldCheck,
  MessageSquare,
  KeyRound,
  HardDrive,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { CourseLiveLectureStatus, SriLankaTimeContext } from '@/lib/timetableService';
import { getCached, setCached } from '@/lib/portalCache';

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    return getCached<any>('admin_current_user') || null;
  });

  const [stats, setStats] = useState(() => {
    const cached = getCached<any>('admin_dashboard_stats');
    return (
      cached || {
        totalStudents: 48,
        tpoptCount: 26,
        tprptCount: 22,
        repsCount: 4,
        totalSessions: 0,
        totalPresent: 0,
        totalAbsent: 0,
        attendanceRate: 0, // Starts at 0% with first mark
        activeAssignments: 2,
      }
    );
  });

  const [liveStatus, setLiveStatus] = useState<{
    tpopt?: CourseLiveLectureStatus;
    tprpt?: CourseLiveLectureStatus;
    context?: SriLankaTimeContext;
  } | null>(() => {
    return getCached<any>('admin_dashboard_livestatus') || null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    return !getCached('admin_dashboard_stats');
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [attRes, ttRes, assignRes, meRes] = await Promise.all([
          fetch('/api/admin/attendance'),
          fetch('/api/admin/timetable'),
          fetch('/api/admin/assignments'),
          fetch('/api/auth/me'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated && meData.user) {
            setCurrentUser(meData.user);
            setCached('admin_current_user', meData.user);
          }
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          const sessCount = attData.metrics?.totalSessions || 0;
          const rate = sessCount > 0 ? attData.metrics?.overallPercentage || 0 : 0;
          const newStats = {
            totalStudents: 48,
            tpoptCount: 26,
            tprptCount: 22,
            repsCount: 4,
            totalSessions: sessCount,
            totalPresent: attData.metrics?.totalPresent || 0,
            totalAbsent: attData.metrics?.totalAbsent || 0,
            attendanceRate: rate,
            activeAssignments: 2,
          };
          setStats(newStats);
          setCached('admin_dashboard_stats', newStats);
        }

        if (ttRes.ok) {
          const ttData = await ttRes.json();
          setLiveStatus(ttData.liveStatus);
          setCached('admin_dashboard_livestatus', ttData.liveStatus);
        }

        if (assignRes.ok) {
          const assignData = await assignRes.json();
          setStats((prev: any) => {
            const updated = {
              ...prev,
              activeAssignments: assignData.assignments?.length || 0,
            };
            setCached('admin_dashboard_stats', updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'LECTURE_ONGOING':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: PlayCircle,
          label: 'Ongoing Lecture',
        };
      case 'UPCOMING_LECTURE':
        return {
          bg: 'bg-[#0088FF]/15 border-[#0088FF]/30 text-[#38BDF8]',
          icon: Clock,
          label: 'Upcoming Lecture Today',
        };
      case 'BREAK':
      case 'LUNCH_BREAK':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          icon: Clock,
          label: status === 'LUNCH_BREAK' ? 'Lunch Break' : 'Interval Break',
        };
      case 'POSTPONED':
        return {
          bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
          icon: AlertTriangle,
          label: 'Postponed',
        };
      case 'UNAVAILABLE':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          icon: AlertCircle,
          label: 'Cancelled / Unavailable',
        };
      default:
        return {
          bg: 'bg-[#1E293B] border-[#334155] text-slate-400',
          icon: CheckCircle2,
          label: 'No Lectures Active',
        };
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Welcome Banner with Live Sri Lanka Time Context */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] to-[#161F30] border border-[#1E293B] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF7900]/20 text-[#FF7900] text-[10px] font-black border border-[#FF7900]/30 uppercase tracking-wide">
                Division Live Console
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {liveStatus?.context?.displayDate || 'Division of Television Studies'} · Sri Lanka
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
              Television Studies Admin Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Batch 11 (2026 Intake) · University College of Rathmalana
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link
              href="/admin/attendance"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/20 transition-all active:scale-95 touch-target"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Mark Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 1. FIRSTLY: Attendance Rate Hero Card (Requested: Show Firstly Attendance Rate button, starting at 0%) */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Prominent Attendance Rate display */}
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center flex-shrink-0">
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
                  strokeDasharray={`${stats.attendanceRate}, 100`}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl sm:text-3xl font-black text-white font-heading">
                  {stats.attendanceRate}%
                </span>
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase">
                  Rate
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF7900]" />
                <h2 className="text-base sm:text-lg font-black text-white">
                  Division Attendance Status
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {stats.totalSessions === 0
                  ? '0 Sessions Recorded · Ready for First Batch 11 Roll-Call'
                  : `${stats.totalSessions} Sessions Recorded · ${stats.totalPresent} Present, ${stats.totalAbsent} Absent`}
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs font-semibold">
                <span className="text-emerald-400 font-mono">Present: {stats.totalPresent}</span>
                <span className="text-slate-600">•</span>
                <span className="text-rose-400 font-mono">Absent: {stats.totalAbsent}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-mono">Enrolled: {stats.totalStudents}</span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/attendance?mode=marking"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/25 transition-all active:scale-95 touch-target"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Take Today&apos;s Attendance</span>
            </Link>

            <Link
              href="/admin/attendance?mode=absentees"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-200 hover:text-white border border-[#334155] text-xs font-bold transition-colors touch-target"
            >
              <Users className="w-4 h-4 text-[#0088FF]" />
              <span>Absentee Roster Filter</span>
            </Link>

            <Link
              href="/admin/timetable"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-200 hover:text-white border border-[#334155] text-xs font-bold transition-colors touch-target"
            >
              <Calendar className="w-4 h-4 text-[#FF7900]" />
              <span>Live Schedule</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students */}
        <Link
          href="/admin/students"
          className="bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] p-4 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-[#0088FF]/15 text-[#0088FF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalStudents}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
            <span className="text-[#FF7900] font-bold">26 TPOPT</span>
            <span>•</span>
            <span className="text-[#0088FF] font-bold">22 TPRPT</span>
          </div>
        </Link>

        {/* Timetable Slots */}
        <Link
          href="/admin/timetable"
          className="bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] p-4 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Foundation Slots</span>
            <div className="w-8 h-8 rounded-lg bg-[#FF7900]/15 text-[#FF7900] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">140</div>
          <div className="text-[11px] text-slate-400 mt-1.5">Click card to postpone/cancel</div>
        </Link>

        {/* Active Assignments */}
        <Link
          href="/admin/assignments"
          className="bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] p-4 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Active Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{stats.activeAssignments}</div>
          <div className="text-[11px] text-slate-400 mt-1.5">Project briefs & deliverables</div>
        </Link>

        {/* Batch Representatives */}
        <Link
          href="/admin/representatives"
          className="bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] p-4 rounded-2xl transition-all shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Representatives</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{stats.repsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1.5">2 TPOPT · 2 TPRPT Leaders</div>
        </Link>
      </div>

      {/* 2. Live Lecture & Timetable Sync Hub */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF7900]" />
            <h2 className="text-sm font-bold text-white">Live Timetable & Online Lecture Status</h2>
          </div>
          <Link
            href="/admin/timetable"
            className="text-xs font-semibold text-[#0088FF] hover:text-[#38BDF8] active:scale-95 transition-all touch-target inline-flex items-center gap-1"
          >
            <span>Manage Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* TPOPT Live Status */}
          {liveStatus?.tpopt && (() => {
            const badge = getStatusBadge(liveStatus.tpopt.status);
            const Icon = badge.icon;
            const currentSlot = liveStatus.tpopt.currentSlot;
            const nextSlot = liveStatus.tpopt.nextSlot;

            return (
              <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#FF7900]/20 text-[#FF7900] text-xs font-black border border-[#FF7900]/30">
                      TPOPT
                    </span>
                    <span className="text-xs font-bold text-white">Post Production</span>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.bg}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {currentSlot ? (
                  <div className="bg-[#161F30] p-3 rounded-xl border border-[#23324A] mb-2.5">
                    <div className="text-xs text-slate-400 mb-0.5">Current Slot ({currentSlot.timeRange})</div>
                    <div className="text-sm font-bold text-white">{currentSlot.subject || 'Break / Scheduled Period'}</div>
                    {currentSlot.room && (
                      <div className="text-xs text-slate-400 mt-1">Room / Lab: {currentSlot.room}</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#161F30] p-3 rounded-xl border border-[#23324A] mb-2.5 text-xs text-slate-400">
                    No active lecture slot in progress right now.
                  </div>
                )}

                {/* Direct Sync Button to Mark Attendance for this Lecture */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1E293B] text-xs">
                  <span className="text-slate-400">
                    {nextSlot ? `Next: ${nextSlot.subject} (${nextSlot.timeRange})` : 'Upcoming: End of day'}
                  </span>
                  <Link
                    href={`/admin/attendance?course=TPOPT${currentSlot?.subject ? `&subject=${encodeURIComponent(currentSlot.subject)}` : ''}`}
                    className="flex items-center gap-1 font-bold text-[#FF7900] hover:underline"
                  >
                    <span>Sync & Mark</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })()}

          {/* TPRPT Live Status */}
          {liveStatus?.tprpt && (() => {
            const badge = getStatusBadge(liveStatus.tprpt.status);
            const Icon = badge.icon;
            const currentSlot = liveStatus.tprpt.currentSlot;
            const nextSlot = liveStatus.tprpt.nextSlot;

            return (
              <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#0088FF]/20 text-[#0088FF] text-xs font-black border border-[#0088FF]/30">
                      TPRPT
                    </span>
                    <span className="text-xs font-bold text-white">Studio Production</span>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.bg}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {currentSlot ? (
                  <div className="bg-[#161F30] p-3 rounded-xl border border-[#23324A] mb-2.5">
                    <div className="text-xs text-slate-400 mb-0.5">Current Slot ({currentSlot.timeRange})</div>
                    <div className="text-sm font-bold text-white">{currentSlot.subject || 'Break / Scheduled Period'}</div>
                    {currentSlot.room && (
                      <div className="text-xs text-slate-400 mt-1">Studio / Room: {currentSlot.room}</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#161F30] p-3 rounded-xl border border-[#23324A] mb-2.5 text-xs text-slate-400">
                    No active lecture slot in progress right now.
                  </div>
                )}

                {/* Direct Sync Button to Mark Attendance for this Lecture */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1E293B] text-xs">
                  <span className="text-slate-400">
                    {nextSlot ? `Next: ${nextSlot.subject} (${nextSlot.timeRange})` : 'Upcoming: End of day'}
                  </span>
                  <Link
                    href={`/admin/attendance?course=TPRPT${currentSlot?.subject ? `&subject=${encodeURIComponent(currentSlot.subject)}` : ''}`}
                    className="flex items-center gap-1 font-bold text-[#0088FF] hover:underline"
                  >
                    <span>Sync & Mark</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 3. Quick Tools Launchpad Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-white">Quick Administrative Console Tools</h2>
          <span className="text-[11px] text-slate-400">
            {currentUser?.role === 'representative' ? (
              <span className="text-[#38BDF8] font-bold">Representative Mode ({currentUser.representativeCourse || 'Cohort'})</span>
            ) : (
              <span className="text-[#FF7900] font-bold">SuperAdmin Console (Full Access)</span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/admin/students"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] hover:border-[#0088FF]/50 transition-all text-center group active:scale-95 touch-target select-none cursor-pointer shadow-md hover:shadow-lg hover:shadow-[#0088FF]/10"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0088FF]/15 text-[#0088FF] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Students Roster</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Search & Details</span>
          </Link>

          <Link
            href="/admin/chat"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] hover:border-[#FF7900]/50 transition-all text-center group active:scale-95 touch-target select-none cursor-pointer shadow-md hover:shadow-lg hover:shadow-[#FF7900]/10"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FF7900]/15 text-[#FF7900] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Division Chat</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Clear & Moderation</span>
          </Link>

          <Link
            href="/admin/tools"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] hover:border-purple-500/50 transition-all text-center group active:scale-95 touch-target select-none cursor-pointer shadow-md hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">PDF Generator</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Printable Lists</span>
          </Link>

          <Link
            href="/admin/invitations"
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] hover:border-emerald-500/50 transition-all text-center group active:scale-95 touch-target select-none cursor-pointer shadow-md hover:shadow-lg hover:shadow-emerald-500/10 relative"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Student Invites</span>
            <span className="text-[10px] text-slate-400 mt-0.5">30-Day Tokens</span>
            {currentUser?.role === 'representative' ? (
              <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1E293B] text-slate-400 border border-[#334155]">
                Rep View
              </span>
            ) : (
              <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SuperAdmin
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
