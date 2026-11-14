'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Sliders, Shield, UserCheck, Clock, Tv } from 'lucide-react';
import { AdminTokenPayload } from '@/lib/auth';
import TabCustomizerModal from './TabCustomizerModal';
import { clearPortalCache } from '@/lib/portalCache';

interface AdminHeaderProps {
  user: AdminTokenPayload | null;
  onTabsChanged?: (tabs: string[]) => void;
  visibleTabs: string[];
}

export default function AdminHeader({ user, onTabsChanged, visibleTabs }: AdminHeaderProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sriLankaTimeStr, setSriLankaTimeStr] = useState('');

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
    try {
      clearPortalCache();
      await fetch('/api/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ucr_user_role');
      }
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0F172A]/95 backdrop-blur-md border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Icon & Header in Blue & Orange */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#FF7900] flex items-center justify-center text-white shadow-lg shadow-[#0088FF]/20 flex-shrink-0">
              <Tv className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white truncate font-heading tracking-tight">
                  UCR TV Studies
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/30">
                  Batch 11
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                University College of Rathmalana
              </p>
            </div>
          </div>

          {/* Right: Sri Lanka Time, User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Clock Widget */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] text-xs text-slate-300 border border-[#334155]">
              <Clock className="w-3.5 h-3.5 text-[#0088FF]" />
              <span className="font-mono text-white text-[11px] font-bold">{sriLankaTimeStr || 'SL Time'}</span>
            </div>

            {/* User Badge */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1E293B] border border-[#334155]">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isSuperAdmin
                      ? 'bg-[#FF7900] text-white shadow'
                      : 'bg-[#0088FF] text-white shadow'
                  }`}
                >
                  {isSuperAdmin ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                    {user.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {user.representativeCourse || (isSuperAdmin ? 'SuperAdmin' : 'Rep')}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Mobile Customizer Trigger */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-colors touch-target"
              title="Customize navigation tabs"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0088FF]" />
              <span>Tabs</span>
            </button>

            {/* Exit/Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 border border-[#334155] hover:border-rose-500/30 text-xs font-bold transition-colors touch-target"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal instance if opened from header */}
      <TabCustomizerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        visibleTabIds={visibleTabs}
        isSuperAdmin={isSuperAdmin}
        onSave={(newTabs) => onTabsChanged && onTabsChanged(newTabs)}
      />
    </>
  );
}
