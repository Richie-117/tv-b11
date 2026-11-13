'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  BookOpen,
  Filter,
  MousePointerClick,
  X,
} from 'lucide-react';
import { Timetable, TimetableSlot, TimetableOverride, CourseType, DayOfWeek } from '@/types';
import { CourseLiveLectureStatus, SriLankaTimeContext } from '@/lib/timetableService';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getTodayDayOfWeek = (): DayOfWeek => {
  const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  return dayNames[todayIdx] || 'Friday';
};

export default function AdminTimetablePage() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [liveStatus, setLiveStatus] = useState<{
    tpopt?: CourseLiveLectureStatus;
    tprpt?: CourseLiveLectureStatus;
    context?: SriLankaTimeContext;
  } | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<CourseType>('TPOPT');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // New override form state
  const [overrideDate, setOverrideDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overrideStatus, setOverrideStatus] = useState<'POSTPONED' | 'UNAVAILABLE'>('POSTPONED');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRescheduleDate, setOverrideRescheduleDate] = useState('');
  const [overrideRescheduleTime, setOverrideRescheduleTime] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);

  const handleOverrideDateChange = (newDateStr: string) => {
    setOverrideDate(newDateStr);
    if (newDateStr) {
      const parts = newDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = dayNames[d.getDay()];
        if (day) setSelectedDay(day);
      }
    }
  };

  const fetchTimetableData = async () => {
    try {
      const res = await fetch('/api/admin/timetable');
      if (res.ok) {
        const d = await res.json();
        setTimetables(d.timetables || []);
        setOverrides(d.overrides || []);
        setLiveStatus(d.liveStatus || null);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, []);

  const activeTimetable = timetables.find((t) => t.course === selectedCourse);

  const daySlots = React.useMemo(() => {
    if (!activeTimetable) return [];
    return (activeTimetable.slots || [])
      .filter((s) => s.dayOfWeek.toLowerCase() === selectedDay.toLowerCase())
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [activeTimetable, selectedDay]);

  // Click on any slot directly to postpone or cancel
  const handleSlotClick = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setOverrideReason(`Lecture ${overrideStatus === 'UNAVAILABLE' ? 'cancelled' : 'postponed'}: ${slot.subject || 'scheduled session'}`);
    setIsOverrideModalOpen(true);
    setErrorMessage(null);
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      setErrorMessage('Please select an exception date.');
      return;
    }

    setIsSavingOverride(true);
    setErrorMessage(null);

    try {
      const slotSubject = selectedSlot?.subject || 'Lecture';
      const res = await fetch('/api/admin/timetable/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetableId: activeTimetable?.id,
          timetableSlotId: selectedSlot?.id || undefined,
          course: selectedCourse,
          exceptionDate: overrideDate,
          status: overrideStatus,
          reason: overrideReason.trim() || `${slotSubject} ${overrideStatus === 'POSTPONED' ? 'Postponed' : 'Cancelled'}`,
          rescheduledDate: overrideRescheduleDate || undefined,
          rescheduledStartTime: overrideRescheduleTime || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Automatically announce in chat so students are immediately notified
        const announcementText = `📢 [Academic Notice] ${selectedCourse} Lecture "${slotSubject}" on ${selectedDay} (${overrideDate}) has been marked as ${
          overrideStatus === 'POSTPONED'
            ? `POSTPONED${overrideRescheduleDate ? ` to ${overrideRescheduleDate} ${overrideRescheduleTime || ''}` : ''}`
            : 'CANCELLED'
        }.${overrideReason ? ` Reason: ${overrideReason}` : ''}`;

        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: announcementText,
            course: selectedCourse,
          }),
        }).catch(() => {});

        setToastMessage(`Lecture ${overrideStatus === 'POSTPONED' ? 'postponement' : 'cancellation'} saved successfully!`);
        setIsOverrideModalOpen(false);
        setOverrideReason('');
        setSelectedSlot(null);
        await fetchTimetableData();
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to save timetable override.');
      }
    } catch (err: any) {
      setErrorMessage('Network connection error while saving override.');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Remove this timetable exception/override?')) return;
    try {
      const res = await fetch(`/api/admin/timetable/override?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setOverrides((prev) => prev.filter((o) => o.id !== id));
        fetchTimetableData();
      }
    } catch (err) {
      alert('Failed to delete override.');
    }
  };

  const currentCourseStatus = selectedCourse === 'TPOPT' ? liveStatus?.tpopt : liveStatus?.tprpt;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-heading">
            <CalendarIcon className="w-6 h-6 text-brand-accent" />
            <span>Academic Timetable & Lecture Schedule</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Click on any lecture slot to postpone or cancel it with a custom reschedule date
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedSlot(null);
            setOverrideReason('');
            setErrorMessage(null);
            setIsOverrideModalOpen(true);
          }}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary text-white text-xs font-bold shadow-md shadow-brand-accent/20 transition-all active:scale-95 touch-target"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Postpone / Cancel Lecture</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Course Toggle & Live Status Banner */}
      <div className="bg-surface/90 border border-surface-border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCourse('TPOPT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
                selectedCourse === 'TPOPT'
                  ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
                  : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
              }`}
            >
              TPOPT (Post Production)
            </button>

            <button
              type="button"
              onClick={() => setSelectedCourse('TPRPT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
                selectedCourse === 'TPRPT'
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                  : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
              }`}
            >
              TPRPT (Studio Production)
            </button>
          </div>

          {liveStatus?.context && (
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <Clock className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Current Time: {liveStatus.context.displayTime} ({liveStatus.context.dayOfWeek})</span>
            </div>
          )}
        </div>

        {/* Live lecture status card */}
        {currentCourseStatus && (
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-0.5">
                Current Status ({selectedCourse})
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{currentCourseStatus.statusLabel}</span>
              </div>
              {currentCourseStatus.currentSlot && (
                <div className="text-xs text-text-secondary mt-1">
                  Active Subject: <strong className="text-white">{currentCourseStatus.currentSlot.subject}</strong> ({currentCourseStatus.currentSlot.timeRange})
                </div>
              )}
            </div>

            {currentCourseStatus.nextSlot && (
              <div className="text-xs text-right sm:border-l sm:border-surface-border sm:pl-4">
                <span className="text-text-muted block text-[10px]">Next Today:</span>
                <span className="font-semibold text-white">
                  {currentCourseStatus.nextSlot.subject} ({currentCourseStatus.nextSlot.timeRange})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap touch-target ${
              selectedDay === day
                ? 'bg-white text-surface shadow-md'
                : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable Slot Grid with Click-To-Postpone */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-text-muted px-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-white">
            <MousePointerClick className="w-3.5 h-3.5 text-brand-accent" />
            <span>{selectedDay} Schedule (Click on any slot to postpone or cancel)</span>
          </span>
          <span className="text-[10px] text-text-muted">Batch 11 — 2026</span>
        </div>

        {daySlots.length === 0 ? (
          <div className="bg-surface/60 border border-surface-border rounded-2xl p-6 text-center text-xs text-text-muted">
            No timetable slots scheduled for {selectedDay}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {daySlots.map((slot) => {
              const isClass = slot.slotType === 'class' && Boolean(slot.subject?.trim());
              const isBreak = slot.slotType === 'break';
              const isLunch = slot.slotType === 'lunch';

              // Check if there is an active override for this slot
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
                  onClick={() => handleSlotClick(slot)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] hover:border-brand-accent ${
                    slotOverride
                      ? slotOverride.status === 'UNAVAILABLE'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-purple-500/10 border-purple-500/30'
                      : isClass
                      ? 'bg-surface/90 border-surface-border hover:shadow-lg'
                      : isLunch
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                      : 'bg-surface-card/60 border-surface-border text-text-muted'
                  }`}
                  title="Click to postpone or cancel this lecture"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-brand-accent">
                      {slot.startTime} – {slot.endTime}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {slotOverride ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            slotOverride.status === 'UNAVAILABLE'
                              ? 'bg-rose-500 text-white'
                              : 'bg-purple-600 text-white'
                          }`}
                        >
                          {slotOverride.status === 'UNAVAILABLE' ? 'Cancelled' : 'Postponed'}
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] opacity-0 group-hover:opacity-100 text-brand-accent font-semibold transition-opacity flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Postpone</span>
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isClass
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-text-muted'
                            }`}
                          >
                            {slot.slotType}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-sm font-bold text-white mb-1 group-hover:text-brand-accent transition-colors flex items-center gap-2">
                    <span>{slot.subject || (isLunch ? 'Lunch Interval' : 'Interval Break')}</span>
                  </div>

                  {slotOverride && slotOverride.reason && (
                    <div className="text-xs text-rose-300 italic mb-1">
                      Notice: {slotOverride.reason}
                      {slotOverride.rescheduledDate && (
                        <span className="block text-purple-300 font-mono text-[11px] not-italic mt-0.5">
                          Rescheduled: {slotOverride.rescheduledDate} {slotOverride.rescheduledStartTime || ''}
                        </span>
                      )}
                    </div>
                  )}

                  {slot.room && (
                    <div className="text-xs text-text-muted">Room / Studio: {slot.room}</div>
                  )}
                  {slot.studentGroup && (
                    <div className="text-[11px] text-text-muted">Target: {slot.studentGroup}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Overrides / Announcements */}
      {overrides.length > 0 && (
        <div className="bg-surface/90 border border-surface-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-purple uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Active Lecture Overrides & Announcements</span>
          </div>

          <div className="space-y-2">
            {overrides.map((ov) => (
              <div
                key={ov.id}
                className="p-3 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-brand-purple">[{ov.status}]</span>
                    <span className="font-mono text-white">{ov.exceptionDate}</span>
                    {ov.course && <span className="text-text-muted">({ov.course})</span>}
                  </div>
                  {ov.reason && <div className="text-text-secondary">{ov.reason}</div>}
                  {ov.rescheduledDate && (
                    <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
                      Rescheduled to: {ov.rescheduledDate} {ov.rescheduledStartTime || ''}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteOverride(ov.id)}
                  className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-white/5"
                  title="Remove override"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Override Modal (Triggered by click on any slot) */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-brand-accent" />
                <span>Postpone or Cancel Lecture</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 text-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-3">
                {errorMessage}
              </div>
            )}

            {selectedSlot && (
              <div className="p-3 rounded-xl bg-surface-card border border-surface-border mb-3 text-xs">
                <span className="text-[10px] text-text-muted block uppercase font-bold">Selected Lecture Slot:</span>
                <span className="font-bold text-white text-sm">{selectedSlot.subject}</span>
                <span className="block text-brand-accent font-mono mt-0.5">
                  {selectedSlot.dayOfWeek} · {selectedSlot.startTime} – {selectedSlot.endTime}
                </span>
              </div>
            )}

            <form onSubmit={handleCreateOverride} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Exception Date (When does this take effect?)
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => handleOverrideDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
                  required
                />
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  Automatically syncs day of the week to selected date
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideStatus('POSTPONED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      overrideStatus === 'POSTPONED'
                        ? 'bg-brand-purple text-white shadow'
                        : 'bg-surface-card border border-surface-border text-text-muted'
                    }`}
                  >
                    Postponed
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideStatus('UNAVAILABLE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      overrideStatus === 'UNAVAILABLE'
                        ? 'bg-rose-500 text-white shadow'
                        : 'bg-surface-card border border-surface-border text-text-muted'
                    }`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Reason / Announcement for Students
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Studio maintenance or faculty consultation"
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
                />
              </div>

              {overrideStatus === 'POSTPONED' && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-border">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Rescheduled Date
                    </label>
                    <input
                      type="date"
                      value={overrideRescheduleDate}
                      onChange={(e) => setOverrideRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Rescheduled Time
                    </label>
                    <input
                      type="time"
                      value={overrideRescheduleTime}
                      onChange={(e) => setOverrideRescheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white"
                  disabled={isSavingOverride}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOverride}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary text-white text-xs font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingOverride ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Override</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
