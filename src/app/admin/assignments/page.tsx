'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Edit2,
  Sparkles,
  Filter,
} from 'lucide-react';
import { Assignment, CourseType } from '@/types';

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filterCourse, setFilterCourse] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState<CourseType | 'ALL'>('ALL');
  const [moduleTitle, setModuleTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/admin/assignments');
      if (res.ok) {
        const d = await res.json();
        setAssignments(d.assignments || []);
      }
    } catch (e) {
      console.error('Failed to load assignments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    try {
      const externalLinks = linkUrl ? [{ title: linkTitle || 'Resource Link', url: linkUrl }] : [];

      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          course,
          moduleTitle,
          deadline,
          priority,
          externalLinks,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        setLinkTitle('');
        setLinkUrl('');
        fetchAssignments();
      }
    } catch (err) {
      alert('Failed to create assignment.');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment schedule?')) return;
    try {
      const res = await fetch(`/api/admin/assignments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      alert('Failed to delete assignment.');
    }
  };

  const handleToggleStatus = async (assignment: Assignment) => {
    const nextStatus = assignment.status === 'completed' ? 'active' : 'completed';
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assignment.id,
          updates: { status: nextStatus },
        }),
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = assignments.filter((a) => {
    if (filterCourse !== 'ALL' && a.course !== filterCourse && a.course !== 'ALL') return false;
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-ucr-orange" />
            <span>Academic Assignments & Tasks</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Admin task scheduler · Deadlines, studio production deliverables & instructions
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ucr-orange hover:bg-ucr-orange-hover text-white text-xs font-bold shadow-md shadow-ucr-orange/20 transition-all active:scale-95 touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterCourse('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target ${
            filterCourse === 'ALL'
              ? 'bg-white text-surface shadow'
              : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
          }`}
        >
          All Tasks ({assignments.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterCourse('TPOPT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target ${
            filterCourse === 'TPOPT'
              ? 'bg-ucr-orange text-white shadow'
              : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
          }`}
        >
          TPOPT (Post-Prod)
        </button>

        <button
          type="button"
          onClick={() => setFilterCourse('TPRPT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target ${
            filterCourse === 'TPRPT'
              ? 'bg-uovt-blue text-white shadow'
              : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
          }`}
        >
          TPRPT (Production)
        </button>
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-surface/60 border border-surface-border rounded-2xl p-8 text-center text-xs text-text-muted">
            No assignments found for the selected scope.
          </div>
        ) : (
          filtered.map((item) => {
            const isCompleted = item.status === 'completed';
            const isUrgent = item.priority === 'urgent';
            const isImportant = item.priority === 'important';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-surface/50 border-surface-border opacity-70'
                    : 'bg-surface/90 border-surface-border shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          item.course === 'TPOPT'
                            ? 'bg-ucr-orange/20 text-ucr-orange border-ucr-orange/30'
                            : item.course === 'TPRPT'
                            ? 'bg-uovt-blue/20 text-uovt-blue border-uovt-blue/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {item.course}
                      </span>

                      {item.priority !== 'normal' && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isUrgent
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.priority}
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Deadline: {new Date(item.deadline).toLocaleString('en-GB')}</span>
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-bold ${
                        isCompleted ? 'line-through text-text-muted' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </h3>

                    {item.moduleTitle && (
                      <div className="text-xs text-text-secondary font-medium">
                        Module: {item.moduleTitle}
                      </div>
                    )}

                    {item.description && (
                      <p className="text-xs text-text-muted leading-relaxed pt-1">
                        {item.description}
                      </p>
                    )}

                    {item.externalLinks && item.externalLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {item.externalLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-uovt-blue hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{link.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-start">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-surface-lighter text-text-secondary hover:text-white border border-surface-border'
                      }`}
                    >
                      {isCompleted ? 'Mark Active' : 'Mark Completed'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(item.id)}
                      className="p-2 text-text-muted hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl shadow-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-ucr-orange" />
              <span>Create Assignment Announcement</span>
            </h3>

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Multi-Camera Studio Lighting Exercise"
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Target Programme
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                  >
                    <option value="ALL">ALL (TPOPT & TPRPT)</option>
                    <option value="TPOPT">TPOPT Only</option>
                    <option value="TPRPT">TPRPT Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Academic Module Title
                </label>
                <input
                  type="text"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. ICT or DM10"
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Submission Deadline
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Instructions & Guidelines
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specific requirements, file formats, and submission instructions"
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Resource Link Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="e.g. Brief Document"
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Resource URL
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-ucr-orange"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-ucr-orange hover:bg-ucr-orange-hover text-white text-xs font-bold shadow"
                >
                  Publish Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

