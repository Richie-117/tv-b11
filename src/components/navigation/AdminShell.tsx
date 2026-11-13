'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminMobileNav from './AdminMobileNav';
import TabCustomizerModal from './TabCustomizerModal';
import { AdminTokenPayload } from '@/lib/auth';

const STORAGE_KEY = 'ucr_mobile_visible_tabs_v1';
const DEFAULT_TABS = ['dashboard', 'students', 'attendance', 'timetable', 'tools'];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminTokenPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleTabs, setVisibleTabs] = useState<string[]>(DEFAULT_TABS);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // If on login page, render children directly without admin chrome
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Load persisted tabs preference
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          setVisibleTabs(parsed);
        }
      }
    } catch (e) {}

    // Check session on initial load or if user is not loaded
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          if (!isLoginPage) {
            router.push('/login');
          }
        }
      } catch (err) {
        if (!isLoginPage) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (!user) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, [user, isLoginPage, router]);

  const handleTabsChanged = (newTabs: string[]) => {
    setVisibleTabs(newTabs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs));
    } catch (e) {}
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-ucr-orange border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-text-muted animate-pulse">
          Loading Division Console...
        </p>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Top Header */}
      <AdminHeader
        user={user}
        visibleTabs={visibleTabs}
        onTabsChanged={handleTabsChanged}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <AdminSidebar
          isSuperAdmin={isSuperAdmin}
          onOpenCustomizer={() => setIsCustomizerOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 pb-24 md:pb-8 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AdminMobileNav
        visibleTabIds={visibleTabs}
        isSuperAdmin={isSuperAdmin}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
      />

      {/* Tab Customizer Modal triggered from mobile nav 'More' */}
      <TabCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        visibleTabIds={visibleTabs}
        isSuperAdmin={isSuperAdmin}
        onSave={handleTabsChanged}
      />
    </div>
  );
}

