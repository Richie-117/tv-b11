'use client';

import React, { useState, useEffect } from 'react';
import { ADMIN_NAV_TABS, NavTabItem } from '@/types';
import {
  X,
  Sliders,
  Check,
  RotateCcw,
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
  Eye,
  EyeOff,
} from 'lucide-react';

interface TabCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleTabIds: string[];
  isSuperAdmin: boolean;
  onSave: (newVisibleIds: string[]) => void;
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

export default function TabCustomizerModal({
  isOpen,
  onClose,
  visibleTabIds,
  isSuperAdmin,
  onSave,
}: TabCustomizerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(visibleTabIds);

  useEffect(() => {
    setSelectedIds(visibleTabIds);
  }, [visibleTabIds, isOpen]);

  if (!isOpen) return null;

  // Filter out superadmin tabs if current user is not superadmin
  const availableTabs = ADMIN_NAV_TABS.filter((tab) => {
    if (tab.superAdminOnly && !isSuperAdmin) return false;
    return true;
  });

  const handleToggle = (tabId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(tabId)) {
        if (prev.length <= 2) {
          alert('You must keep at least 2 tabs visible for mobile navigation.');
          return prev;
        }
        return prev.filter((id) => id !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  const handleReset = () => {
    const defaults = availableTabs.filter((t) => t.defaultVisible).map((t) => t.id);
    setSelectedIds(defaults);
  };

  const handleSave = () => {
    onSave(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F172A] border border-[#1E293B] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#161F30]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Customize Mobile Tabs</h2>
              <p className="text-xs text-slate-400">Choose which tabs appear on your bottom bar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors touch-target flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          <div className="bg-[#161F30] p-3 rounded-xl border border-[#23324A] mb-3 text-xs text-slate-300 leading-relaxed">
            Toggle tabs below to pin or hide them on mobile. Hidden tabs can always be reopened here or from the top menu.
          </div>

          {availableTabs.map((tab) => {
            const Icon = ICON_MAP[tab.iconName] || LayoutDashboard;
            const isVisible = selectedIds.includes(tab.id);

            return (
              <div
                key={tab.id}
                onClick={() => handleToggle(tab.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  isVisible
                    ? 'bg-[#1E293B] border-[#FF7900]/50 shadow-sm'
                    : 'bg-[#161F30]/60 border-[#23324A] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isVisible
                        ? 'bg-[#FF7900] text-white shadow'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      {tab.label}
                      {tab.superAdminOnly && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#0088FF]/20 text-[#38BDF8] border border-[#0088FF]/30">
                          SuperAdmin
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {isVisible ? 'Visible on mobile bottom bar' : 'Hidden from mobile bar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      isVisible
                        ? 'bg-[#FF7900]/20 text-[#FF7900]'
                        : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1E293B] bg-[#161F30] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors touch-target"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors touch-target"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#FF7900] hover:bg-[#E66C00] rounded-xl shadow-lg shadow-[#FF7900]/20 transition-all active:scale-95 touch-target"
            >
              <Check className="w-4 h-4" />
              Apply Tabs ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
