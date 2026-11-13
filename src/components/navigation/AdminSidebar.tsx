'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  FileText,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  HardDrive,
  Sliders,
  KeyRound,
} from 'lucide-react';
import { ADMIN_NAV_TABS } from '@/types';

interface AdminSidebarProps {
  isSuperAdmin: boolean;
  onOpenCustomizer: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  FileText,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  HardDrive,
  KeyRound,
};

export default function AdminSidebar({ isSuperAdmin, onOpenCustomizer }: AdminSidebarProps) {
  const pathname = usePathname();

  const tabs = ADMIN_NAV_TABS.filter((tab) => {
    if (tab.superAdminOnly && !isSuperAdmin) return false;
    return true;
  });

  return (
    <aside className="hidden md:flex flex-col w-64 p-4 sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0">
      <div className="bg-[#0F172A] rounded-2xl border border-[#1E293B] p-3 shadow-xl flex flex-col h-full">
        <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
          <span>Admin Console</span>
          <span className="text-[10px] text-[#0088FF] font-mono">B11</span>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = ICON_MAP[tab.iconName] || LayoutDashboard;
            const isActive = pathname === tab.href || (tab.href !== '/admin' && pathname.startsWith(tab.href));

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF7900] to-[#E66C00] text-white shadow-md shadow-[#FF7900]/25'
                    : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#0088FF]'}`} />
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.superAdminOnly && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1E293B] text-[#0088FF] border border-[#334155]">
                    Super
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Sidebar Action: Customize tabs */}
        <div className="pt-3 border-t border-[#1E293B] mt-auto">
          <button
            type="button"
            onClick={onOpenCustomizer}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <Sliders className="w-4 h-4 text-[#0088FF]" />
            <span>Customize Tabs</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
