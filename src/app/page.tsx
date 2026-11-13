'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Film,
  Tv,
} from 'lucide-react';
import { CourseLiveLectureStatus, SriLankaTimeContext } from '@/lib/timetableService';

export default function HomePage() {
  const [liveStatus, setLiveStatus] = useState<{
    tpopt?: CourseLiveLectureStatus;
    tprpt?: CourseLiveLectureStatus;
    context?: SriLankaTimeContext;
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/timetable')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.liveStatus) setLiveStatus(data.liveStatus);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col selection:bg-[#FF7900] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-[#1E293B]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#FF7900] flex items-center justify-center text-white shadow-lg shadow-[#0088FF]/20 flex-shrink-0">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight font-heading">
                UCR TV Studies
              </span>
              <span className="block text-[10px] text-slate-400">Batch 11 — Intake 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E293B]/70 border border-[#334155]/60 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-slate-300">Live Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-14 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E293B] border border-[#334155] text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#FF7900] animate-pulse" />
            <span className="text-white font-semibold">Batch 11 - Television Division</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-heading">
            Division of Television Studies
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Leading television production, multi-camera broadcasting, and digital post-production training for Batch 11.
          </p>

          <div className="pt-2 flex items-center justify-center">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-sm font-bold shadow-xl shadow-[#FF7900]/25 transition-all active:scale-95 touch-target"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Real-Time Live Timetable Glance */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 sm:p-6 shadow-xl max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0088FF]" />
              <h2 className="text-sm font-bold text-white font-heading">Live Lecture Schedule Status</h2>
            </div>
            <span className="text-xs font-mono text-[#38BDF8] font-bold">
              {liveStatus?.context?.displayTime || 'Asia/Colombo'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* TPOPT Glance */}
            <div className="p-4 rounded-xl bg-[#161F30] border border-[#23324A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/30">
                  TPOPT
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {liveStatus?.tpopt?.statusLabel || 'Regular Classes'}
                </span>
              </div>
              <div className="text-sm font-bold text-white">Post Production Technology</div>
              <div className="text-xs text-slate-400">
                {liveStatus?.tpopt?.currentSlot
                  ? `${liveStatus.tpopt.currentSlot.subject} (${liveStatus.tpopt.currentSlot.timeRange})`
                  : 'No active session at this moment'}
              </div>
            </div>

            {/* TPRPT Glance */}
            <div className="p-4 rounded-xl bg-[#161F30] border border-[#23324A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#0088FF]/20 text-[#38BDF8] border border-[#0088FF]/30">
                  TPRPT
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {liveStatus?.tprpt?.statusLabel || 'Regular Classes'}
                </span>
              </div>
              <div className="text-sm font-bold text-white">Production Technology</div>
              <div className="text-xs text-slate-400">
                {liveStatus?.tprpt?.currentSlot
                  ? `${liveStatus.tprpt.currentSlot.subject} (${liveStatus.tprpt.currentSlot.timeRange})`
                  : 'No active session at this moment'}
              </div>
            </div>
          </div>
        </div>

        {/* Programme Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">TPOPT Programme</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Television & Digital Media Post Production Technology. Multi-track non-linear editing, proxy media workflows, Foley audio, colour grading, and delivery master standards.
            </p>
            <div className="text-xs font-bold text-[#FF7900] pt-1">26 Enrolled Students · Batch 11</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">TPRPT Programme</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Television & Digital Media Production Technology. Multi-camera TV studio floor operations, vision mixing, camera pedestal handling, intercom communications, and studio lighting.
            </p>
            <div className="text-xs font-bold text-[#0088FF] pt-1">22 Enrolled Students · Batch 11</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] bg-[#0A0E17] py-6 text-center text-xs text-slate-500">
        Division of Television Studies · University College of Rathmalana · Batch 11
      </footer>
    </div>
  );
}
