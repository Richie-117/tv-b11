'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CalendarMark {
  sessionId: string;
  date: string; // YYYY-MM-DD
  moduleTitle: string;
  moduleCode?: string;
  sessionType: string;
  status: 'present' | 'absent' | 'excused' | 'cancelled' | 'outside_period' | 'unmarked';
  remarks?: string;
  isValid?: boolean;
}

export default function StudentAttendancePage() {
  const [stats, setStats] = useState<{
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number | null;
    formattedRate?: string;
    hasData?: boolean;
  }>({
    totalSessions: 0,
    presentCount: 0,
    absentCount: 0,
    excusedCount: 0,
    attendanceRate: null,
    formattedRate: 'No attendance data',
    hasData: false,
  });
  const [marks, setMarks] = useState<CalendarMark[]>([]);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar Navigation: current viewed Year and Month
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)); // Default to Nov 2026
  const [selectedDayMark, setSelectedDayMark] = useState<CalendarMark | null>(null);

  useEffect(() => {
    fetch('/api/student/attendance')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStats(d.stats);
          setMarks(d.calendarMarks || []);
          setStudentInfo(d.student);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayMark(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayMark(null);
  };

  // Build grid days
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const mark = marks.find((m) => m.date === dateStr);
    calendarCells.push({ day, dateStr, mark });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
          <div className="w-9 h-9 rounded-xl bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <span>My Attendance Record</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Visualized daily attendance calendar, official division sessions, and absence logs
        </p>
      </div>

      {/* Summary Cards in Blue & Orange Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 shadow-xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${stats.attendanceRate !== null ? 'text-[#0088FF]' : 'text-slate-500'}`}>
            {stats.attendanceRate !== null ? `${stats.attendanceRate}%` : 'Not available'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {!stats.hasData ? 'No attendance data' : `${stats.presentCount} of ${stats.totalSessions} Valid Sessions`}
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 shadow-xl">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Days Present</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {stats.presentCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Attended official lectures</div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 shadow-xl">
          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Days Absent</div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
            {stats.absentCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Unexcused missed sessions</div>
        </div>

        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 shadow-xl">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Excused Absence</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
            {stats.excusedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Authorized medical / leave</div>
        </div>
      </div>

      {/* Main Interactive Attendance Calendar */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Calendar Month Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#FF7900]" />
            <h2 className="text-base font-bold text-white font-heading">{monthName}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-slate-300">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-300">Excused</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-slate-300">Cancelled / Postponed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#1E293B] border border-[#334155]" />
            <span className="text-slate-500">No Session / Excluded</span>
          </div>
        </div>

        {/* Calendar Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 py-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-14 sm:h-20 rounded-xl bg-transparent" />;
            }

            const { day, dateStr, mark } = cell;
            const isSelected = selectedDayMark?.date === dateStr;

            return (
              <div
                key={dateStr}
                onClick={() => mark && setSelectedDayMark(mark)}
                className={`h-14 sm:h-20 rounded-xl p-1.5 sm:p-2 border transition-all flex flex-col justify-between select-none ${
                  mark
                    ? 'cursor-pointer hover:scale-105'
                    : 'opacity-50 cursor-default'
                } ${
                  isSelected
                    ? 'ring-2 ring-[#0088FF] border-[#0088FF]'
                    : mark?.status === 'present'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : mark?.status === 'absent'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : mark?.status === 'excused'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[#161F30]/60 border-[#23324A]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{day}</span>
                  {mark && (
                    <span
                      className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                        mark.status === 'present'
                          ? 'bg-emerald-500'
                          : mark.status === 'absent'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  )}
                </div>

                {mark && (
                  <div className="hidden sm:block">
                    <span className="text-[9px] font-bold text-slate-400 block truncate">
                      {mark.moduleCode || mark.moduleTitle}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase ${
                        mark.status === 'present'
                          ? 'text-emerald-400'
                          : mark.status === 'absent'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {mark.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDayMark ? (
        <div className="p-4 rounded-2xl bg-[#161F30] border border-[#23324A] shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#FF7900] bg-[#FF7900]/20 px-2 py-0.5 rounded border border-[#FF7900]/30">
                {selectedDayMark.date}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  selectedDayMark.status === 'present'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : selectedDayMark.status === 'absent'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {selectedDayMark.status}
              </span>
            </div>
            <button
              onClick={() => setSelectedDayMark(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>

          <h3 className="text-sm font-bold text-white">
            {selectedDayMark.moduleTitle} {selectedDayMark.moduleCode ? `[${selectedDayMark.moduleCode}]` : ''}
          </h3>
          <p className="text-xs text-slate-400">
            Session Type: <strong className="text-slate-200 capitalize">{selectedDayMark.sessionType}</strong>
            {selectedDayMark.remarks && ` · Note: ${selectedDayMark.remarks}`}
          </p>
        </div>
      ) : (
        <div className="p-3 text-center text-xs text-slate-500">
          Tip: Tap any marked day on the calendar to inspect specific lecture details.
        </div>
      )}
    </div>
  );
}

