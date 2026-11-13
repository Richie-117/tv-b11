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
  MoreHorizontal,
} from 'lucide-react';
import { ADMIN_NAV_TABS, NavTabItem } from '@/types';

interface AdminMobileNavProps {
  visibleTabIds: string[];
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

export default function AdminMobileNav({
  visibleTabIds,
  isSuperAdmin,
  onOpenCustomizer,
}: AdminMobileNavProps) {
  const pathname = usePathname();

  const activeTabs = ADMIN_NAV_TABS.filter((tab) => {
    if (tab.superAdminOnly && !isSuperAdmin) return false;
    return visibleTabIds.includes(tab.id);
  });

  return (
    <nav className="fixed bottom-3 left-3 right-3 max-w-lg mx-auto z-40 md:hidden pb-safe">
      <div className="bg-[#0F172A]/95 border border-[#1E293B] text-white rounded-2xl shadow-2xl h-16 px-2 flex items-center justify-around backdrop-blur-xl">
        {activeTabs.map((tab) => {
          const Icon = ICON_MAP[tab.iconName] || LayoutDashboard;
          const isActive = pathname === tab.href || (tab.href !== '/admin' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 flex-1 transition-all touch-target select-none ${
                isActive ? 'text-[#FF7900]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative flex flex-col items-center">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#FF7900]' : ''}`} />
                <span className={`text-[10px] mt-0.5 font-bold ${isActive ? 'text-[#FF7900]' : 'text-slate-400'}`}>
                  {tab.label.split(' ')[0]}
                </span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-[#FF7900] rounded-full mt-0.5 shadow-sm shadow-[#FF7900]" />
                )}
              </div>
            </Link>
          );
        })}

        {/* More button */}
        <button
          type="button"
          onClick={onOpenCustomizer}
          className="flex flex-col items-center justify-center py-1 flex-1 text-slate-400 hover:text-white transition-all touch-target select-none"
          title="More tabs"
        >
          <div className="relative flex flex-col items-center">
            <MoreHorizontal className="w-5 h-5 text-[#0088FF]" />
            <span className="text-[10px] mt-0.5 font-bold text-slate-400">Tabs</span>
          </div>
        </button>
      </div>
    </nav>
  );
}
