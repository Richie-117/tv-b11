'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  ExternalLink,
  Upload,
  CheckCircle2,
  FileText,
  X,
  MessageSquare,
  AlertCircle,
  Paperclip,
  Download,
  Calendar,
  User,
  Share2,
} from 'lucide-react';
import { Assignment, CourseType } from '@/types';

const ACADEMIC_MODULES = [
  { code: 'ENGLISH', title: 'English' },
  { code: 'DM7', title: 'DM7' },
  { code: 'DM10', title: 'DM10' },
  { code: 'ICT', title: 'ICT' },
  { code: 'GAFFER', title: 'Gaffer' },
  { code: 'MATHS', title: 'Maths' },
  { code: 'ENG-DRAW', title: 'Engineering Drawing' },
  { code: 'NVQ-PHYS', title: 'NVQ Physics I,II' },
  { code: 'CGD', title: 'Computer Graphic Designer' },
  { code: 'OSH', title: 'OSH' },
  { code: 'GENERAL', title: 'General Practical Workshop' },
];

export default function StudentWorkspacePage() {
  const [projects, setProjects] = useState<Assignment[]>([]);
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Upload Project Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [moduleCode, setModuleCode] = useState('ENGLISH');
  const [targetCourse, setTargetCourse] = useState<'ALL' | 'TPOPT' | 'TPRPT'>('ALL');
  const [description, setDescription] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [broadcastToChat, setBroadcastToChat] = useState(true);

  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<{
    url: string;
    name: string;
    size: string;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWorkspaceProjects = async () => {
    try {
      const res = await fetch('/api/student/workspace');
      if (res.ok) {
        const d = await res.json();
        setProjects(d.projects || []);
      }
    } catch (e) {
      console.error('Error fetching workspace:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceProjects();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    const limitLabel = isImage ? '5MB' : '10MB';

    if (file.size > maxSize) {
      alert(`File size exceeds maximum allowed ${limitLabel} for ${isImage ? 'images' : 'documents'}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingFile(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/student/workspace/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setAttachedFile({
          url: data.url,
          name: data.fileName,
          size: data.fileSize,
        });
      } else {
        setErrorMessage(data.error || 'Failed to upload attachment.');
      }
    } catch (err) {
      setErrorMessage('Network connection error while uploading file.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a project or task title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const selectedMod = ACADEMIC_MODULES.find((m) => m.code === moduleCode);

    try {
      const res = await fetch('/api/student/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          course: targetCourse,
          moduleId: selectedMod?.code,
          moduleTitle: selectedMod ? `[${selectedMod.code}] ${selectedMod.title}` : 'Television Workshop',
          deadline: deadline || undefined,
          externalLink: externalLink.trim() || undefined,
          attachmentUrl: attachedFile?.url || undefined,
          attachmentName: attachedFile?.name || undefined,
          mentionInChat: broadcastToChat,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessNotice(`Project "${title.trim()}" published to the Workspace successfully!`);
        setIsUploadModalOpen(false);
        setTitle('');
        setDescription('');
        setExternalLink('');
        setDeadline('');
        setAttachedFile(null);
        await fetchWorkspaceProjects();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to publish project.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (courseFilter === 'ALL') return true;
    return p.course === courseFilter || p.course === 'ALL';
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
            <div className="w-9 h-9 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Student Tasks & Project Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload your student projects, share deliverable links with classmates, and coordinate submissions
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setIsUploadModalOpen(true);
          }}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/25 transition-all active:scale-95 touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Project / Task</span>
        </button>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Programme Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCourseFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            courseFilter === 'ALL'
              ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
              : 'bg-[#111827] border border-[#1E293B] text-slate-400 hover:text-white'
          }`}
        >
          All Programmes ({projects.length})
        </button>
        <button
          type="button"
          onClick={() => setCourseFilter('TPOPT')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            courseFilter === 'TPOPT'
              ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/20'
              : 'bg-[#111827] border border-[#1E293B] text-slate-400 hover:text-white'
          }`}
        >
          TPOPT ({projects.filter((p) => p.course === 'TPOPT' || p.course === 'ALL').length})
        </button>
        <button
          type="button"
          onClick={() => setCourseFilter('TPRPT')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            courseFilter === 'TPRPT'
              ? 'bg-[#0088FF] text-white shadow-md shadow-[#0088FF]/20'
              : 'bg-[#111827] border border-[#1E293B] text-slate-400 hover:text-white'
          }`}
        >
          TPRPT ({projects.filter((p) => p.course === 'TPRPT' || p.course === 'ALL').length})
        </button>
      </div>

      {/* Shared Projects List */}
      <div className="space-y-3.5">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-[#111827] rounded-2xl border border-[#1E293B] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#161F30] border border-[#23324A] text-slate-500 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-[#FF7900]" />
            </div>
            <div className="text-sm font-bold text-white">No Projects or Tasks Uploaded Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The workspace is clean. Tap the <strong>&quot;Upload New Project / Task&quot;</strong> button above to share your edits, studio plans, or project links with fellow students.
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isTpopt = project.course === 'TPOPT';
            const isTprpt = project.course === 'TPRPT';

            return (
              <div
                key={project.id}
                className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] shadow-xl space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isTpopt
                          ? 'bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/30'
                          : isTprpt
                          ? 'bg-[#0088FF]/20 text-[#38BDF8] border border-[#0088FF]/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {project.course}
                    </span>
                    {project.moduleTitle && (
                      <span className="text-xs font-semibold text-slate-400 truncate">
                        {project.moduleTitle}
                      </span>
                    )}
                  </div>

                  {project.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#FF7900]" />
                      <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-heading">{project.title}</h3>
                  {project.description && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* External Links & Attachments */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {project.externalLinks &&
                    project.externalLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161F30] hover:bg-[#1E293B] border border-[#23324A] text-xs font-bold text-[#38BDF8] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{link.title || 'Open Project Link'}</span>
                      </a>
                    ))}

                  {project.attachments &&
                    project.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{att.title || (att as any).name || 'Download Deliverable'}</span>
                      </a>
                    ))}

                  <Link
                    href={`/student/chat`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161F30] hover:bg-[#1E293B] border border-[#23324A] text-xs font-bold text-slate-400 hover:text-white transition-colors ml-auto"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#FF7900]" />
                    <span>Discuss in Division Chat</span>
                  </Link>
                </div>

                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Uploaded by: {project.createdByAdminName || 'Student'}</span>
                  </span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload New Project / Task Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white font-heading">
                  Upload Student Project or Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-4">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Project / Task Title <span className="text-[#FF7900]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Multi-Camera Studio Floor Plan (Studio B)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
                  required
                />
              </div>

              {/* Module & Programme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Academic Module</label>
                  <select
                    value={moduleCode}
                    onChange={(e) => setModuleCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
                  >
                    {ACADEMIC_MODULES.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.code} - {m.title.slice(0, 26)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Target Programme</label>
                  <select
                    value={targetCourse}
                    onChange={(e) => setTargetCourse(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
                  >
                    <option value="ALL">All Programmes</option>
                    <option value="TPOPT">TPOPT (Post Production)</option>
                    <option value="TPRPT">TPRPT (Studio Production)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Project Notes & Brief
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project, deliverable details, or notes for classmates..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900] resize-none"
                />
              </div>

              {/* External Link */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Project Link (Google Drive, OneDrive, YouTube, Frame.io)
                </label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#0088FF]"
                />
              </div>

              {/* File Attachment Upload */}
              <div className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#FF7900]" />
                    <span>Attach Document or Image</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Max: 5MB Images · 10MB Documents
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {attachedFile ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#111827] border border-emerald-500/30 text-emerald-300">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate text-xs">{attachedFile.name}</span>
                      <span className="text-[10px] text-slate-400">({attachedFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="text-slate-400 hover:text-rose-400 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="w-full py-2.5 px-3 rounded-lg border border-dashed border-[#334155] hover:border-[#FF7900] text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isUploadingFile ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#FF7900] border-t-transparent rounded-full animate-spin" />
                        <span>Uploading file to Cloudflare R2...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-[#FF7900]" />
                        <span>Select File to Upload (Images &le; 5MB, Documents &le; 10MB)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Chat Announcement Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={broadcastToChat}
                  onChange={(e) => setBroadcastToChat(e.target.checked)}
                  className="rounded border-[#23324A] bg-[#161F30] text-[#FF7900] focus:ring-[#FF7900]"
                />
                <span>Broadcast notification to Division Community Chat</span>
              </label>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingFile}
                  className="px-5 py-2.5 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white font-bold shadow-lg shadow-[#FF7900]/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Project</span>
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
