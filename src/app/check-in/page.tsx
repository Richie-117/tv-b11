'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Radio,
  Tv,
  ArrowRight,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Activity,
} from 'lucide-react';

interface ActiveSession {
  id: string;
  course: 'TPOPT' | 'TPRPT' | 'ALL';
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  sessionType: string;
  date: string;
  startTime: string;
  endTime: string;
  checkinExpiresAt?: string;
  markedByAdminName?: string;
}

interface StudentInfo {
  id: string;
  studentNumber: string;
  fullName: string;
  course: 'TPOPT' | 'TPRPT';
  lastNumber: string;
}

export default function PublicCheckInPage() {
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [checkedInNumbers, setCheckedInNumbers] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<'TPOPT' | 'TPRPT'>('TPOPT');
  const userChosenCourseRef = React.useRef<boolean>(false);
  const [inputDigits, setInputDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    fullName: string;
    studentNumber: string;
    moduleTitle: string;
    timestamp: string;
    alreadyCheckedIn?: boolean;
  } | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. Fetch active check-in broadcast
  const fetchActiveStatus = async (showInitialLoading = false) => {
    if (showInitialLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/checkin/active', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        if (data.hasActiveSession && (data.activeSession || data.activeSessions?.length > 0)) {
          const main = data.activeSession || data.activeSessions[0];
          setActiveSession(main);
          setActiveSessions(data.activeSessions || [main]);

          // Device lock: if this device has already checked in for this session, restore locked receipt
          try {
            const savedDeviceRecord = localStorage.getItem(`ucr_checkin_${main.id}`);
            if (savedDeviceRecord) {
              const parsed = JSON.parse(savedDeviceRecord);
              if (parsed && parsed.studentNumber) {
                setSuccessResult(parsed);
              }
            }
          } catch (e) {}

          // Only default course on first load if user hasn't explicitly chosen one yet
          if (!userChosenCourseRef.current) {
            if (main.course === 'TPRPT') {
              setSelectedCourse('TPRPT');
            } else if (main.course === 'TPOPT') {
              setSelectedCourse('TPOPT');
            }
          }
        } else {
          setActiveSession(null);
          setActiveSessions([]);
        }
        setStudents(data.students || []);
        setCheckedInNumbers(data.checkedInStudentNumbers || []);
      }
      setLastSyncedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to sync check-in broadcast:', err);
    } finally {
      if (showInitialLoading) setLoading(false);
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  useEffect(() => {
    fetchActiveStatus(true);
    // Gentle 15-second background sync interval to eliminate rapid log spamming
    const interval = setInterval(() => {
      fetchActiveStatus(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute best matching active session for currently selected course
  const currentSession = useMemo(() => {
    if (!activeSessions || activeSessions.length === 0) return activeSession;
    const forSelected = activeSessions.find(
      (s) => s.course === selectedCourse || s.course === 'ALL'
    );
    return forSelected || activeSessions[0] || activeSession;
  }, [activeSessions, activeSession, selectedCourse]);

  // Format digits to 2-digit number (e.g. "2" -> "02")
  const paddedDigits = useMemo(() => {
    const cleaned = inputDigits.replace(/\D/g, '');
    if (!cleaned) return '';
    return cleaned.padStart(2, '0');
  }, [inputDigits]);

  // Construct preview full index
  const previewFullIndex = useMemo(() => {
    if (!paddedDigits) return '';
    return `RT/${selectedCourse}/26/${paddedDigits}`;
  }, [selectedCourse, paddedDigits]);

  // Match student from loaded roster (checking both TPOPT and TPRPT accurately)
  const matchedStudent = useMemo(() => {
    if (!paddedDigits) return null;
    return (
      students.find(
        (s) =>
          s.course === selectedCourse &&
          (s.lastNumber === paddedDigits ||
           s.lastNumber.padStart(2, '0') === paddedDigits ||
           s.studentNumber.toUpperCase().endsWith(`/${paddedDigits}`) ||
           s.studentNumber.toUpperCase().endsWith(`/${inputDigits.trim()}`))
      ) || null
    );
  }, [students, selectedCourse, paddedDigits, inputDigits]);

  // Check if matched student is already marked present
  const isAlreadyPresent = useMemo(() => {
    if (!matchedStudent) return false;
    const cleanNum = matchedStudent.studentNumber.toUpperCase();
    return checkedInNumbers.includes(cleanNum);
  }, [matchedStudent, checkedInNumbers]);

  const handleSelectCourse = (course: 'TPOPT' | 'TPRPT') => {
    userChosenCourseRef.current = true;
    setSelectedCourse(course);
    setErrorMessage(null);
  };

  // Handle submit check-in
  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sessionToUse = currentSession || activeSession;
    if (!sessionToUse) return;
    if (!matchedStudent) {
      setErrorMessage(`Please enter a valid student number for ${selectedCourse}.`);
      return;
    }

    if (isAlreadyPresent) {
      setErrorMessage(
        `Duplicate Check-In Blocked: ${matchedStudent.fullName} (${matchedStudent.studentNumber}) is already marked Present for this session.`
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkin/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionToUse.id,
          studentNumber: matchedStudent.studentNumber,
          course: selectedCourse,
          lastNumber: paddedDigits,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to complete check-in.');
        if (data.alreadyCheckedIn) {
          setCheckedInNumbers((prev) => [...prev, matchedStudent.studentNumber.toUpperCase()]);
        }
      } else {
        const finalResult = {
          fullName: data.student?.fullName || matchedStudent.fullName,
          studentNumber: data.student?.studentNumber || matchedStudent.studentNumber,
          moduleTitle: sessionToUse.moduleTitle,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          alreadyCheckedIn: false,
        };
        setSuccessResult(finalResult);
        setCheckedInNumbers((prev) => [...prev, matchedStudent.studentNumber.toUpperCase()]);

        // Permanently lock this device to this student for this session
        try {
          localStorage.setItem(`ucr_checkin_${sessionToUse.id}`, JSON.stringify(finalResult));
          localStorage.setItem('ucr_last_checked_in_session', sessionToUse.id);
        } catch (e) {}
      }
    } catch (err: any) {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cyber-terminal min-h-screen bg-[#F1F5F9] text-[#0F172A] font-sans flex flex-col justify-between selection:bg-[#0088FF] selection:text-white relative overflow-hidden">
      {/* Scoped CSS for Dark Text Contrast & Cyber Animations */}
      <style jsx global>{`
        .cyber-terminal h1,
        .cyber-terminal h2,
        .cyber-terminal h3,
        .cyber-terminal h4,
        .cyber-terminal .font-heading {
          color: #0f172a !important;
        }
        @keyframes cyber-radar-sweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes cyber-wave {
          0%,
          100% {
            height: 4px;
          }
          50% {
            height: 18px;
          }
        }
        .animate-radar {
          animation: cyber-radar-sweep 4s linear infinite;
        }
        .wave-bar {
          animation: cyber-wave 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* Cybernetic High-Tech Grid & Tech Neon Ambient Glows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 136, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 136, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-gradient-to-b from-[#0088FF]/15 via-[#38BDF8]/10 to-transparent blur-3xl pointer-events-none" />

      {/* Futuristic Cyber Top Bar */}
      <header className="relative z-10 w-full max-w-xl mx-auto px-4 pt-5 pb-2">
        <div className="bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl px-4 py-3 shadow-md shadow-slate-300/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0088FF] to-[#004DB3] text-white flex items-center justify-center shadow-lg shadow-[#0088FF]/30 relative overflow-hidden">
              <Tv className="w-5 h-5 relative z-10 text-white" />
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-base tracking-tight text-slate-900">
                  TV B11
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-blue-50 text-[#0088FF] border border-blue-200">
                  TERMINAL v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold tracking-tight">
                Division of Television Studies · UCR
              </p>
            </div>
          </div>

          {/* Interactive Cyber Live Signal & Instant Refresh Pill */}
          <button
            type="button"
            onClick={() => fetchActiveStatus(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-bold shadow-inner cursor-pointer transition-all active:scale-95"
            title="Tap to sync broadcast now"
          >
            {activeSession ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                  LIVE SYNC
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
                <span className="text-slate-600 font-medium text-[11px]">
                  STANDBY
                </span>
              </div>
            )}
            <RefreshCw className={`w-3 h-3 text-slate-400 hover:text-[#0088FF] ${isRefreshing ? 'animate-spin text-[#0088FF]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-xl mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        {loading ? (
          /* Connecting HUD */
          <div className="bg-white border border-slate-300 rounded-3xl p-8 shadow-xl text-center space-y-4 relative overflow-hidden">
            <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#0088FF]" />
            <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#0088FF]" />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#0088FF]" />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#0088FF]" />

            <div className="w-14 h-14 mx-auto rounded-full border-4 border-slate-100 border-t-[#0088FF] animate-spin" />
            <h3 className="font-heading text-lg font-black text-slate-900 tracking-tight">
              INITIALIZING ATTENDANCE TERMINAL...
            </h3>
            <p className="text-xs font-mono text-slate-500 font-bold">
              ESTABLISHING ENCRYPTED TELEMETRY LINK
            </p>
          </div>
        ) : successResult ? (
          /* Cyber Success Screen */
          <div className="bg-white border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-500/10 text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Cyber Corner HUD Brackets */}
            <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm" />
            <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm" />
            <span className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm" />
            <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-500 rounded-br-sm" />

            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                {successResult.alreadyCheckedIn ? 'RECORD VERIFIED' : 'ATTENDANCE CONFIRMED'}
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                {successResult.fullName}
              </h2>
              <div className="inline-block px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 font-mono text-sm font-black text-[#0088FF]">
                {successResult.studentNumber}
              </div>
            </div>

            {/* Verification Telemetry */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Lecture Session:</span>
                <span className="font-bold text-slate-900 text-right">{successResult.moduleTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  PRESENT ✓
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Timestamp:</span>
                <span className="font-bold text-slate-700">{successResult.timestamp}</span>
              </div>
            </div>

            {/* Locked Attendance Badge - Strict Single Student Policy */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Attendance Secured · Device Locked</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Your check-in is officially recorded for this lecture session. Only one student check-in per device per session is permitted.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchActiveStatus(false)}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 touch-target cursor-pointer border border-slate-300 active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing Registry...' : 'Refresh Status'}</span>
            </button>
          </div>
        ) : !activeSession ? (
          /* Standby Screen (No Check-in Pushed) */
          <div className="bg-white border-2 border-slate-300 rounded-3xl p-7 sm:p-10 shadow-xl shadow-slate-300/50 text-center space-y-6 relative overflow-hidden">
            {/* Cyber Corner HUD Brackets */}
            <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#0088FF] rounded-tl-sm" />
            <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#0088FF] rounded-tr-sm" />
            <span className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#0088FF] rounded-bl-sm" />
            <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#0088FF] rounded-br-sm" />

            {/* Holographic Radar Scanner Animation */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed border-[#0088FF]/35 animate-spin"
                style={{ animationDuration: '18s' }}
              />
              <div className="absolute inset-3 rounded-full border border-[#0088FF]/40" />
              <div className="absolute inset-7 rounded-full border border-slate-200" />

              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div
                  className="w-full h-full animate-radar origin-center"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(0, 136, 255, 0.35) 360deg)',
                  }}
                />
              </div>

              <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#0055CC] text-white flex items-center justify-center shadow-lg shadow-[#0088FF]/30">
                <Radio className="w-6 h-6 animate-pulse text-white" />
              </div>
            </div>

            <div className="space-y-2.5 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-mono font-black uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-[#0088FF]" />
                RADAR ACTIVE · STANDBY
              </div>

              <h2 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-snug">
                No Attendance Check-In Available
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                There are currently no active lecture check-ins open. This terminal is actively monitoring and will automatically display the roll-call session as soon as one starts.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0s' }} />
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0.4s' }} />
                  <span className="w-1 bg-[#0088FF] rounded-full wave-bar" style={{ animationDelay: '0.1s' }} />
                </div>
                <span>Listening for Broadcasts...</span>
              </div>

              <button
                type="button"
                onClick={() => fetchActiveStatus(false)}
                className="font-bold text-[#0088FF] hover:text-[#0055CC] inline-flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm active:scale-95 transition-all text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Checking...' : 'Check Now'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Check-in Form Screen */
          <div className="bg-white border-2 border-slate-300 rounded-3xl shadow-2xl shadow-slate-300/60 p-5 sm:p-7 space-y-6 relative overflow-hidden backdrop-blur-xl">
            {/* Cyber Corner HUD Brackets */}
            <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#0088FF] rounded-tl-sm" />
            <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#0088FF] rounded-tr-sm" />
            <span className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#0088FF] rounded-bl-sm" />
            <span className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#0088FF] rounded-br-sm" />

            {/* Active Lecture Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-black uppercase tracking-wider shadow-sm shadow-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  ROLL-CALL ACTIVE
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold bg-white/90 px-2.5 py-0.5 rounded-md border border-blue-200">
                  <Clock className="w-3.5 h-3.5 text-[#0088FF]" />
                  <span>
                    {(currentSession || activeSession)?.startTime} - {(currentSession || activeSession)?.endTime}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {(currentSession || activeSession)?.moduleTitle}
                </h2>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 font-semibold">
                  <span className="font-mono text-[11px] font-bold text-[#0088FF] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {(currentSession || activeSession)?.course === 'ALL'
                      ? `ALL BATCH 11 (COMMON) · ${selectedCourse} ACTIVE`
                      : `${selectedCourse} COHORT SELECTED`}
                  </span>
                  <span>·</span>
                  <span className="text-slate-800">{(currentSession || activeSession)?.sessionType}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Select Programme (TPOPT or TPRPT) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                [01] SELECT YOUR PROGRAMME
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectCourse('TPOPT')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden touch-target cursor-pointer ${
                    selectedCourse === 'TPOPT'
                      ? 'bg-gradient-to-br from-[#FF7900] to-[#E66C00] text-white border-[#FF7900] shadow-lg shadow-[#FF7900]/30 scale-[1.02]'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-base font-black font-heading leading-tight">
                    TPOPT
                  </div>
                  <div
                    className={`text-[11px] font-semibold leading-tight ${
                      selectedCourse === 'TPOPT' ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    Post Production
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectCourse('TPRPT')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden touch-target cursor-pointer ${
                    selectedCourse === 'TPRPT'
                      ? 'bg-gradient-to-br from-[#0088FF] to-[#0055CC] text-white border-[#0088FF] shadow-lg shadow-[#0088FF]/30 scale-[1.02]'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-base font-black font-heading leading-tight">
                    TPRPT
                  </div>
                  <div
                    className={`text-[11px] font-semibold leading-tight ${
                      selectedCourse === 'TPRPT' ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    Production Tech
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Enter Index Last Number */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  [02] ENTER LAST DIGITS OF INDEX ({selectedCourse})
                </label>
                <span className="text-[11px] text-slate-500 font-mono font-bold">
                  e.g. &quot;02&quot; or &quot;2&quot;
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 font-mono text-sm font-bold">
                  RT/{selectedCourse}/26/
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputDigits}
                  onChange={(e) => {
                    setInputDigits(e.target.value.slice(0, 3));
                    setErrorMessage(null);
                  }}
                  placeholder="02"
                  className="w-full pl-36 pr-4 py-3.5 rounded-2xl bg-white border-2 border-slate-300 text-xl font-mono font-black text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 transition-all text-left shadow-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Real-Time Student Identity Preview */}
            {paddedDigits && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                {matchedStudent ? (
                  <div
                    className={`p-4 rounded-2xl border-2 space-y-2 ${
                      isAlreadyPresent
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-blue-50/90 border-blue-300 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600">
                        VERIFIED STUDENT MATCH
                      </span>
                      {isAlreadyPresent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                          ALREADY RECORDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                          <UserCheck className="w-3.5 h-3.5" />
                          VERIFIED READY
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-heading font-black text-lg text-slate-900 leading-tight">
                        {matchedStudent.fullName}
                      </div>
                      <div className="font-mono text-xs font-black text-[#0088FF] pt-0.5">
                        {matchedStudent.studentNumber} · {matchedStudent.course}
                      </div>
                      {isAlreadyPresent && (
                        <div className="mt-2 p-2 rounded-xl bg-amber-100/70 border border-amber-300/80 text-[11px] font-mono text-amber-900 font-bold flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span>Already Recorded: This student index is already marked Present for this session.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>
                      No student found in <strong>{selectedCourse}</strong> with index #{paddedDigits}.
                      Please re-check the number.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Big Confirm Check-In Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleCheckIn()}
                disabled={!matchedStudent || isSubmitting || isAlreadyPresent}
                className={`w-full py-4 px-6 rounded-2xl font-heading font-black text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2 touch-target ${
                  isAlreadyPresent
                    ? 'bg-amber-100 border-2 border-amber-300 text-amber-900 cursor-not-allowed shadow-none'
                    : matchedStudent && !isSubmitting
                    ? 'bg-gradient-to-r from-[#0088FF] to-[#0055CC] hover:from-[#0072D6] hover:to-[#0044AA] text-white shadow-xl shadow-[#0088FF]/30 active:scale-[0.98] cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>TRANSMITTING CHECK-IN...</span>
                  </>
                ) : isAlreadyPresent ? (
                  <>
                    <Lock className="w-5 h-5 text-amber-700" />
                    <span>Already Recorded</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Check In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Futuristic Clean Footer */}
      <footer className="relative z-10 w-full max-w-xl mx-auto px-5 py-4 text-center text-[11px] font-mono text-slate-500 flex items-center justify-between border-t border-slate-300/80 mt-4 font-semibold">
        <span>TV B11 · TERMINAL PORTAL</span>
        {lastSyncedTime && <span>SYNCED: {lastSyncedTime}</span>}
      </footer>
    </div>
  );
}
