'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Copy,
  Check,
  Tag,
  Phone,
  Mail,
  MapPin,
  Shield,
  Edit2,
  Plus,
  X,
  AlertCircle,
  ExternalLink,
  UserCheck,
  Lock,
} from 'lucide-react';
import { Student, StudentLabel, CourseType } from '@/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [labels, setLabels] = useState<StudentLabel[]>([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'TPOPT' | 'TPRPT' | 'REPS'>('ALL');
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected student for detail modal
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Label creation modal
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#0088FF');
  const [newLabelDesc, setNewLabelDesc] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/admin/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchStudents(), fetchLabels()]).finally(() => setIsLoading(false));
  }, []);

  const handleCopy = (text: string, labelKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(labelKey);
    setTimeout(() => setCopyFeedback(null), 1800);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (courseFilter === 'TPOPT' && s.course !== 'TPOPT') return false;
      if (courseFilter === 'TPRPT' && s.course !== 'TPRPT') return false;
      if (courseFilter === 'REPS' && !s.isRepresentative) return false;
      if (selectedLabelId && !s.labels?.includes(selectedLabelId)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesNum = s.studentNumber.toLowerCase().includes(q);
        const matchesPhone = s.phoneNumber && s.phoneNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesPhone) return false;
      }

      return true;
    });
  }, [students, courseFilter, selectedLabelId, search]);

  const handleOpenEdit = (student: Student) => {
    setActiveStudent(student);
    setEditFormData({
      fullName: student.fullName,
      phoneNumber: student.phoneNumber || '',
      email: student.email || '',
      residentialAddress: student.residentialAddress || '',
      parentGuardianName: student.parentGuardianName || '',
      parentGuardianPhone: student.parentGuardianPhone || '',
      emergencyContact: student.emergencyContact || '',
      notes: student.notes || '',
    });
    setIsEditing(true);
  };

  const handleSaveStudent = async () => {
    if (!activeStudent) return;
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeStudent.id,
          updates: editFormData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveStudent(data.student);
        setStudents((prev) => prev.map((s) => (s.id === data.student.id ? data.student : s)));
        setIsEditing(false);
      }
    } catch (err) {
      alert('Failed to save student details.');
    }
  };

  const handleToggleLabel = async (student: Student, labelId: string) => {
    const current = student.labels || [];
    const nextLabels = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];

    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          updates: { labels: nextLabels },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (activeStudent && activeStudent.id === student.id) {
          setActiveStudent(data.student);
        }
        setStudents((prev) => prev.map((s) => (s.id === student.id ? data.student : s)));
      }
    } catch (err) {
      console.error('Error updating labels:', err);
    }
  };

  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [labelModalError, setLabelModalError] = useState<string | null>(null);

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) {
      setLabelModalError('Please enter a label name.');
      return;
    }

    setIsCreatingLabel(true);
    setLabelModalError(null);

    try {
      const res = await fetch('/api/admin/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor || '#00FF55',
          description: newLabelDesc.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.label) {
        setLabels((prev) => [...prev, data.label]);
        setNewLabelName('');
        setNewLabelDesc('');
        setIsLabelModalOpen(false);
      } else {
        setLabelModalError(data.error || 'Failed to create student label.');
      }
    } catch (err) {
      setLabelModalError('Network error while creating label.');
    } finally {
      setIsCreatingLabel(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
            <div className="w-9 h-9 rounded-xl bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span>Students Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verified intake records · Batch 11 — 2026 ({students.length} Total Enrolled)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLabelModalOpen(true)}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#27354E] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-all"
        >
          <Tag className="w-4 h-4 text-[#FF7900]" />
          <span>New Label</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name, index (RT/TPOPT/...), or phone..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips in Blue & Orange */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setCourseFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              courseFilter === 'ALL'
                ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
                : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
            }`}
          >
            All Students ({students.length})
          </button>

          <button
            onClick={() => setCourseFilter('TPOPT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              courseFilter === 'TPOPT'
                ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/20'
                : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
            }`}
          >
            TPOPT ({students.filter((s) => s.course === 'TPOPT').length})
          </button>

          <button
            onClick={() => setCourseFilter('TPRPT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              courseFilter === 'TPRPT'
                ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
                : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
            }`}
          >
            TPRPT ({students.filter((s) => s.course === 'TPRPT').length})
          </button>

          <button
            onClick={() => setCourseFilter('REPS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              courseFilter === 'REPS'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-[#161F30] text-slate-400 hover:text-white border border-[#23324A]'
            }`}
          >
            Batch Reps ({students.filter((s) => s.isRepresentative).length})
          </button>

          {labels.length > 0 && (
            <select
              value={selectedLabelId}
              onChange={(e) => setSelectedLabelId(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-[#161F30] border border-[#23324A] text-xs font-bold text-slate-300 hover:text-white focus:outline-none focus:border-[#0088FF]"
            >
              <option value="">Filter by Label (All)</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  🏷️ {l.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 px-1 flex items-center justify-between">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
          <span className="text-[11px] text-[#0088FF]">Tap card for full record</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredStudents.map((student) => {
            const isTpopt = student.course === 'TPOPT';
            const initials = student.fullName
              .split(' ')
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('');

            return (
              <div
                key={student.id}
                onClick={() => setActiveStudent(student)}
                className="bg-[#111827] hover:bg-[#161F30] border border-[#1E293B] hover:border-[#0088FF]/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {student.profileImageUrl ? (
                        <img
                          src={student.profileImageUrl}
                          alt={student.fullName}
                          className="w-11 h-11 rounded-xl object-cover border border-[#23324A] flex-shrink-0 shadow"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0 shadow ${
                            isTpopt ? 'bg-[#FF7900]' : 'bg-[#0088FF]'
                          }`}
                        >
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              isTpopt
                                ? 'bg-[#FF7900]/20 text-[#FF7900] border-[#FF7900]/30'
                                : 'bg-[#0088FF]/20 text-[#38BDF8] border-[#0088FF]/30'
                            }`}
                          >
                            {student.course}
                          </span>

                          <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1">
                            {student.studentNumber}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(student.studentNumber, `card-num-${student.id}`);
                              }}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5"
                              title="Copy index"
                            >
                              {copyFeedback === `card-num-${student.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white mt-1 group-hover:text-[#FF7900] transition-colors truncate">
                          {student.fullName}
                        </h3>
                      </div>
                    </div>

                    {student.isRepresentative && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black flex-shrink-0">
                        {student.representativeRole || 'Rep'}
                      </span>
                    )}
                  </div>

                  {/* Phone preview */}
                  {student.phoneNumber ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-2 pl-1">
                      <Phone className="w-3.5 h-3.5 text-[#0088FF] flex-shrink-0" />
                      <span className="font-mono">{student.phoneNumber}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(student.phoneNumber!, `card-ph-${student.id}`);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white rounded"
                        title="Copy phone"
                      >
                        {copyFeedback === `card-ph-${student.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 mt-2 pl-1 italic">
                      Contact details not recorded
                    </div>
                  )}
                </div>

                {/* Assigned Labels */}
                {student.labels && student.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-[#1E293B]">
                    {student.labels.map((lblId) => {
                      const meta = labels.find((l) => l.id === lblId);
                      if (!meta) return null;
                      return (
                        <span
                          key={lblId}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border"
                          style={{
                            backgroundColor: `${meta.color}20`,
                            borderColor: `${meta.color}50`,
                            color: meta.color,
                          }}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{meta.name}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Detail Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-xl bg-[#111827] border border-[#1E293B] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[#1E293B] flex items-center justify-between bg-[#161F30]">
              <div className="flex items-center gap-3 min-w-0">
                {activeStudent.profileImageUrl ? (
                  <img
                    src={activeStudent.profileImageUrl}
                    alt={activeStudent.fullName}
                    className="w-10 h-10 rounded-xl object-cover border border-[#23324A] shadow flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow ${
                      activeStudent.course === 'TPOPT' ? 'bg-[#FF7900]' : 'bg-[#0088FF]'
                    }`}
                  >
                    {activeStudent.course === 'TPOPT' ? 'TP' : 'TR'}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate">{activeStudent.fullName}</h2>
                  <p className="text-xs font-mono text-slate-400">{activeStudent.studentNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(activeStudent)}
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors touch-target flex items-center gap-1.5 text-xs font-bold"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4 text-[#FF7900]" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => {
                    setActiveStudent(null);
                    setIsEditing(false);
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors touch-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {isEditing ? (
                <div className="space-y-3.5 text-xs">
                  <h3 className="font-bold text-[#FF7900] uppercase tracking-wider">
                    Update Student Personal Details
                  </h3>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Full Student Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.fullName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Student Telephone Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.phoneNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Personal Email Address
                    </label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Residential Address
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.residentialAddress || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, residentialAddress: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Parent / Guardian Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.parentGuardianName || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, parentGuardianName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Parent Phone Number
                      </label>
                      <input
                        type="text"
                        value={editFormData.parentGuardianPhone || ''}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, parentGuardianPhone: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Administrative Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStudent}
                      className="px-5 py-2 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#161F30] p-4 rounded-xl border border-[#23324A] space-y-3">
                    <div className="text-xs font-bold text-[#FF7900] uppercase tracking-wider">
                      Academic Profile
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Student Index No</span>
                        <span className="font-mono font-bold text-white mt-0.5 block">{activeStudent.studentNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Academic Programme</span>
                        <span className="font-bold text-white mt-0.5 block">{activeStudent.course}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161F30] p-4 rounded-xl border border-[#23324A] space-y-2.5 text-xs">
                    <div className="font-bold text-[#0088FF] uppercase tracking-wider">
                      Private Contacts
                    </div>
                    <div>Phone: <strong className="text-white">{activeStudent.phoneNumber || '—'}</strong></div>
                    <div>Email: <strong className="text-white">{activeStudent.email || '—'}</strong></div>
                    <div>Address: <strong className="text-white">{activeStudent.residentialAddress || '—'}</strong></div>
                    <div>Parent: <strong className="text-white">{activeStudent.parentGuardianName || '—'}</strong> ({activeStudent.parentGuardianPhone || '—'})</div>
                  </div>

                  {/* Label Assignment */}
                  <div className="bg-[#161F30] p-4 rounded-xl border border-[#23324A] space-y-2">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Assigned Labels
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {labels.map((l) => {
                        const isAssigned = activeStudent.labels?.includes(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleToggleLabel(activeStudent, l.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              isAssigned
                                ? 'shadow'
                                : 'opacity-40 hover:opacity-80 bg-[#1E293B] border-[#334155] text-slate-400'
                            }`}
                            style={
                              isAssigned
                                ? {
                                    backgroundColor: `${l.color}20`,
                                    borderColor: `${l.color}60`,
                                    color: l.color,
                                  }
                                : {}
                            }
                          >
                            <Tag className="w-3 h-3" />
                            <span>{l.name}</span>
                            {isAssigned && <Check className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Label Modal */}
      {isLabelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#FF7900]" />
                <span>Create Student Label</span>
              </h3>
              <button onClick={() => setIsLabelModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {labelModalError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs mb-3">
                {labelModalError}
              </div>
            )}

            <form onSubmit={handleCreateLabel} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Label Name</label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="e.g. Project Lead or Pending NIC"
                  className="w-full px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-[#161F30] border border-[#23324A] cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl bg-[#161F30] border border-[#23324A] font-mono text-white uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLabelModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLabel}
                  className="px-4 py-2 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingLabel ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Label</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
