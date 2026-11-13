'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Tv, LogOut, Clock, User, Calendar, BookOpen, MessageSquare, LayoutDashboard, CheckSquare } from 'lucide-react';

export default function StudentHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [sriLankaTimeStr, setSriLankaTimeStr] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/student/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.student?.profileImageUrl) {
          setStudentPhoto(d.student.profileImageUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Colombo',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setSriLankaTimeStr(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ucr_user_role');
    }
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { label: 'Overview', href: '/student', icon: LayoutDashboard },
    { label: 'Attendance', href: '/student/attendance', icon: CheckSquare },
    { label: 'Timetable', href: '/student/timetable', icon: Calendar },
    { label: 'Workspace', href: '/student/workspace', icon: BookOpen },
    { label: 'Division Chat', href: '/student/chat', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0F172A]/95 backdrop-blur-md border-b border-[#1E293B]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/student" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#FF7900] flex items-center justify-center text-white shadow-lg shadow-[#0088FF]/20 flex-shrink-0">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white font-heading tracking-tight">UCR TV Studies</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#0088FF]/20 text-[#38BDF8] border border-[#0088FF]/30">
                Student
              </span>
            </div>
            <span className="block text-[10px] text-slate-400">Batch 11 · 2026 Intake</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
                    : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] text-xs text-slate-300 border border-[#334155]">
            <Clock className="w-3.5 h-3.5 text-[#0088FF]" />
            <span className="font-mono text-white text-[11px] font-bold">{sriLankaTimeStr}</span>
          </div>

          <Link
            href="/student/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-white text-xs font-bold border border-[#334155] transition-colors"
          >
            {studentPhoto ? (
              <img src={studentPhoto} alt="Profile" className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#FF7900]" />
            )}
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors touch-target"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
