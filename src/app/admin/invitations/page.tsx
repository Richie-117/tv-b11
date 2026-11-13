'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Search,
  Sparkles,
  Users,
  Trash2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Student } from '@/types';

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/admin/invitations');
      if (res.ok) {
        const d = await res.json();
        setInvitations(d.invitations || []);
        setStudents(d.students || []);
        if (d.students && d.students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(d.students[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          studentId: student.id,
          studentNumber: student.studentNumber,
          studentName: student.fullName,
          course: student.course,
        }),
      });
      if (res.ok) {
        setActionMessage(`Invitation voucher created for ${student.fullName}`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchInvitations();
      }
    } catch (e) {
      alert('Failed to generate invite code.');
    }
  };

  const handleBulkGenerate = async () => {
    if (!confirm('Generate individual 7-day invitation vouchers for all Batch 11 students?')) return;
    setIsBulkGenerating(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk', course: 'ALL' }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`Generated ${data.count} new student vouchers!`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchInvitations();
      }
    } catch (e) {
      alert('Failed to bulk generate vouchers.');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Revoke and delete this invitation voucher?')) return;
    try {
      const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      alert('Failed to revoke code.');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  // Filtered invitations list
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      // Course filter
      if (filterCourse !== 'ALL' && inv.course !== filterCourse && inv.course !== 'ALL') {
        return false;
      }

      // Status filter
      const isExpired = inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now();
      if (statusFilter === 'UNUSED') {
        if (inv.isUsed || isExpired) return false;
      } else if (statusFilter === 'USED') {
        if (!inv.isUsed) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = (inv.code || '').toLowerCase().includes(q);
        const nameMatch = (inv.studentName || '').toLowerCase().includes(q);
        const numMatch = (inv.studentNumber || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !numMatch) return false;
      }

      return true;
    });
  }, [invitations, filterCourse, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-heading">
            <KeyRound className="w-6 h-6 text-[#0088FF]" />
            <span>Student Invitation Codes & Access Tokens</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue secure 7-day single-use access vouchers bound to each student account in Batch 11
          </p>
        </div>

        <button
          type="button"
          disabled={isBulkGenerating}
          onClick={handleBulkGenerate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0088FF] to-[#FF7900] hover:opacity-90 text-white text-xs font-bold shadow-lg touch-target transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isBulkGenerating ? 'Issuing Vouchers...' : 'Generate Codes for All Students'}</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Generator Form */}
        <div className="lg:col-span-5 bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FF7900]" />
            <h2 className="text-sm font-bold text-white font-heading">Issue Voucher by Student Account</h2>
          </div>

          <form onSubmit={handleGenerateSingle} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Select Enrolled Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white text-xs focus:outline-none focus:border-[#FF7900] touch-target"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.studentNumber} · {st.fullName} ({st.course})
                  </option>
                ))}
              </select>
            </div>

            {selectedStudentId && (
              <div className="p-3 rounded-xl bg-[#1E293B]/60 border border-[#334155] space-y-1">
                {(() => {
                  const s = students.find((item) => item.id === selectedStudentId);
                  if (!s) return null;
                  return (
                    <>
                      <div className="text-[11px] text-slate-300">
                        Index: <strong>{s.studentNumber}</strong>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Name: <strong>{s.fullName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Programme: <strong className="text-[#FF7900]">{s.course}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1">
                        Validity: <strong>7 Days from generation</strong> (Single use)
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/20 transition-all touch-target"
            >
              Issue Student Invitation Voucher
            </button>
          </form>
        </div>

        {/* Existing Invitations List */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
            <h2 className="text-sm font-bold text-white font-heading">
              Active Vouchers ({filteredInvitations.length})
            </h2>

            {/* Quick Status Filters */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === 'ALL' ? 'bg-[#0088FF] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNUSED')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === 'UNUSED' ? 'bg-[#0088FF] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Unused
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('USED')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === 'USED' ? 'bg-[#0088FF] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Activated
              </button>
            </div>
          </div>

          {/* Search & Programme Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search index, name, or code..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF]"
              />
            </div>

            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs text-white focus:outline-none focus:border-[#0088FF]"
            >
              <option value="ALL">All Programmes</option>
              <option value="TPOPT">TPOPT</option>
              <option value="TPRPT">TPRPT</option>
            </select>
          </div>

          {/* Vouchers Grid */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredInvitations.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#161F30]/40 border border-[#23324A] text-center text-xs text-slate-400">
                No invitation vouchers match the selected filter.
              </div>
            ) : (
              filteredInvitations.map((inv) => {
                const isExpired = inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now();
                return (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl bg-[#161F30] border border-[#23324A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-[#334155] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-white text-sm tracking-wide">
                          {inv.code}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                            inv.course === 'TPOPT'
                              ? 'bg-[#FF7900]/20 text-[#FF7900] border-[#FF7900]/30'
                              : inv.course === 'TPRPT'
                              ? 'bg-[#0088FF]/20 text-[#0088FF] border-[#0088FF]/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {inv.course}
                        </span>
                        {inv.isUsed ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            ✓ Activated
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                            Active (Unused)
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300 mt-1 font-medium">
                        {inv.studentNumber ? (
                          <span>
                            <strong>{inv.studentNumber}</strong> · {inv.studentName}
                          </span>
                        ) : (
                          <span>{inv.studentName}</span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                        {inv.usedByStudentNumber && ` · Activated by ${inv.usedByStudentNumber}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopy(inv.code)}
                        className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#27354E] text-white text-xs font-semibold flex items-center gap-1 border border-[#334155] transition-colors"
                      >
                        {copiedCode === inv.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#0088FF]" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Revoke voucher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
