'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Calendar, BookOpen, MessageSquare, ShieldCheck } from 'lucide-react';

export default function StudentMobileNav() {
  const pathname = usePathname();
  const [isRep, setIsRep] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && (d.user?.role === 'representative' || d.user?.role === 'superadmin')) {
          setIsRep(true);
        }
      })
      .catch(() => {});
  }, []);

  const links = [
    { label: 'Overview', href: '/student', icon: LayoutDashboard },
    { label: 'Attendance', href: '/student/attendance', icon: CheckSquare },
    { label: 'Timetable', href: '/student/timetable', icon: Calendar },
    { label: 'Tasks', href: '/student/workspace', icon: BookOpen },
    { label: 'Chat', href: '/student/chat', icon: MessageSquare },
    ...(isRep ? [{ label: 'Admin', href: '/admin', icon: ShieldCheck, isRepTab: true }] : []),
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-40 md:hidden pb-safe">
      <div className="bg-[#0F172A]/95 border border-[#1E293B] text-white rounded-2xl shadow-2xl h-16 px-2 flex items-center justify-around backdrop-blur-xl">
        {links.map((link: any) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 flex-1 transition-all touch-target select-none ${
                link.isRepTab
                  ? 'text-[#FF7900] hover:text-[#FFA040]'
                  : isActive
                  ? 'text-[#0088FF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative flex flex-col items-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    link.isRepTab
                      ? 'text-[#FF7900]'
                      : isActive
                      ? 'scale-110 text-[#0088FF]'
                      : ''
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 font-bold ${
                    link.isRepTab
                      ? 'text-[#FF7900]'
                      : isActive
                      ? 'text-[#0088FF]'
                      : 'text-slate-400'
                  }`}
                >
                  {link.label}
                </span>
                {isActive && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 shadow-sm ${link.isRepTab ? 'bg-[#FF7900] shadow-[#FF7900]' : 'bg-[#0088FF] shadow-[#0088FF]'}`} />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
