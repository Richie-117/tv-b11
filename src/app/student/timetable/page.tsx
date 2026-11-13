'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Timetable, CourseType, DayOfWeek } from '@/types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getTodayDayOfWeek = (): DayOfWeek => {
  const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  return dayNames[todayIdx] || 'Friday';
};

export default function StudentTimetablePage() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseType>('TPOPT');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek);

  useEffect(() => {
    fetch('/api/admin/timetable')
      .then((r) => r.json())
      .then((d) => {
        setTimetables(d.timetables || []);
        setOverrides(d.overrides || []);
      })
      .catch(() => {});
  }, []);

  const activeTimetable = timetables.find((t) => t.course === selectedCourse);
  const daySlots = (activeTimetable?.slots || [])
    .filter((s) => s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase())
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
            <div className="w-9 h-9 rounded-xl bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span>Academic Lecture Timetable</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Foundation Programme 2026 · Official timetable and slot schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCourse('TPOPT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCourse === 'TPOPT'
                ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/20'
                : 'bg-[#111827] border border-[#1E293B] text-slate-400 hover:text-white'
            }`}
          >
            TPOPT (26)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourse('TPRPT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCourse === 'TPRPT'
                ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
                : 'bg-[#111827] border border-[#1E293B] text-slate-400 hover:text-white'
            }`}
          >
            TPRPT (22)
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSelectedDay(d)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedDay === d
                ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
                : 'bg-[#111827] text-slate-400 hover:text-white border border-[#1E293B]'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Slots */}
      <div className="space-y-3">
        {daySlots.length === 0 ? (
          <div className="p-8 text-center bg-[#111827] rounded-2xl border border-[#1E293B] text-xs text-slate-400">
            No lectures scheduled for {selectedDay}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {daySlots.map((slot) => {
              const isClass = slot.slotType === 'class' && Boolean(slot.subject?.trim());
              const isLunch = slot.slotType === 'lunch';

              const slotOverride = overrides.find(
                (o) =>
                  o.isActive &&
                  o.course === selectedCourse &&
                  (o.timetableSlotId === slot.id ||
                    (slot.subject && o.reason && o.reason.toLowerCase().includes(slot.subject.toLowerCase())))
              );

              return (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border shadow-sm transition-all ${
                    slotOverride
                      ? slotOverride.status === 'UNAVAILABLE'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-purple-500/10 border-purple-500/30'
                      : isClass
                      ? 'bg-[#111827] border-[#1E293B] hover:border-[#0088FF]/40'
                      : isLunch
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : 'bg-[#161F30]/50 border-[#1E293B] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-[#FF7900]">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    {slotOverride ? (
                      <span
                        className={`text-[10px] uppercase font-bold text-white px-2 py-0.5 rounded-md ${
                          slotOverride.status === 'UNAVAILABLE' ? 'bg-rose-600' : 'bg-purple-600'
                        }`}
                      >
                        {slotOverride.status === 'UNAVAILABLE' ? 'Cancelled' : 'Postponed'}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded-md bg-[#1E293B] border border-[#334155]">
                        {slot.slotType}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {slot.subject || (isLunch ? 'Lunch Interval' : 'Interval Break')}
                  </div>
                  {slotOverride && slotOverride.reason && (
                    <div className="text-xs text-rose-300 italic mt-1">
                      Notice: {slotOverride.reason}
                      {slotOverride.rescheduledDate && (
                        <span className="block text-purple-300 font-mono text-[11px] not-italic mt-0.5">
                          Rescheduled: {slotOverride.rescheduledDate} {slotOverride.rescheduledStartTime || ''}
                        </span>
                      )}
                    </div>
                  )}
                  {slot.room && (
                    <div className="text-xs text-slate-400 mt-1">Location: {slot.room}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
