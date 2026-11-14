'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Download,
  UploadCloud,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileText,
  Cloud,
  RefreshCw,
  FolderDown,
  CloudUpload,
  CheckCircle,
  Database,
  ExternalLink,
} from 'lucide-react';

interface R2Backup {
  key: string;
  filename: string;
  size: string;
  bytes: number;
  lastModified: string;
  etag?: string;
}

export default function AdminBackupsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingR2, setIsUploadingR2] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [r2Backups, setR2Backups] = useState<R2Backup[]>([]);
  const [r2Status, setR2Status] = useState<'idle' | 'in_progress' | 'success' | 'failed'>('idle');
  const [r2Message, setR2Message] = useState<string | null>(null);
  const [lastR2Backup, setLastR2Backup] = useState<R2Backup | null>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // File upload ref for manual JSON recovery
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadedSnapshot, setUploadedSnapshot] = useState<any | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [restoreSourceType, setRestoreSourceType] = useState<'upload' | 'r2'>('upload');
  const [selectedR2Key, setSelectedR2Key] = useState<string>('');

  const fetchR2Backups = async () => {
    try {
      const res = await fetch('/api/admin/backup?action=r2-list');
      if (res.ok) {
        const d = await res.json();
        const list = d.r2Backups || [];
        setR2Backups(list);
        if (list.length > 0) {
          setLastR2Backup(list[0]);
          if (r2Status === 'idle') setR2Status('success');
        } else {
          if (r2Status === 'idle') setR2Status('idle');
        }
      }
    } catch (e) {
      console.warn('Error fetching R2 backups:', e);
    }
  };

  useEffect(() => {
    fetchR2Backups();
  }, []);

  // 1. Cloudflare R2 Backup Push
  const handlePushR2Backup = async () => {
    setIsUploadingR2(true);
    setR2Status('in_progress');
    setError(null);
    setR2Message(null);
    try {
      const res = await fetch('/api/admin/backup?action=r2-upload');
      const data = await res.json();
      if (res.ok && data.success) {
        setR2Status('success');
        setR2Message(`Backup uploaded to Cloudflare R2 (${data.size}, ETag: ${data.etag || 'verified'})`);
        await fetchR2Backups();
      } else {
        setR2Status('failed');
        setError(data.error || 'Cloudflare R2 backup upload failed.');
      }
    } catch (err: any) {
      setR2Status('failed');
      setError('Connection error uploading backup to Cloudflare R2.');
    } finally {
      setIsUploadingR2(false);
    }
  };

  // 2. Download directly from Cloudflare R2
  const handleDownloadR2 = (key: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/admin/backup?action=r2-download&key=${encodeURIComponent(key)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Local Backup Download
  const handleDownloadLocalBackup = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backup');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.snapshot, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UCR_Local_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to generate local backup.');
      }
    } catch (e) {
      setError('Connection error generating local backup.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Handle File Upload for Restore
  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const snapshot = parsed.snapshot || parsed;
        if (!snapshot || !Array.isArray(snapshot.students)) {
          alert('Invalid backup JSON format. Must contain a valid students list.');
          return;
        }
        setUploadedSnapshot(snapshot);
        setRestoreSourceType('upload');
        setConfirmRestoreOpen(true);
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // 5. Trigger Restore
  const executeRestore = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const payload: any = {};
      if (restoreSourceType === 'upload') {
        payload.snapshot = uploadedSnapshot;
      } else {
        payload.r2Key = selectedR2Key;
      }

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const d = await res.json();
        setRestoreResult(d);
        setConfirmRestoreOpen(false);
        setUploadedSnapshot(null);
      } else {
        const err = await res.json();
        setError(err.error || 'Restoration failed.');
      }
    } catch (e) {
      setError('Connection error during restoration.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-heading">
            <HardDrive className="w-6 h-6 text-[#FF7900]" />
            <span>Disaster Backups & Cloud Recovery</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloudflare R2 online snapshots, local JSON exports, and zero-loss roll-back verification
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={uploadInputRef}
            accept=".json"
            className="hidden"
            onChange={handleFileChosen}
          />

          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#23324A] text-white border border-[#334155] text-xs font-bold transition-all touch-target"
          >
            <UploadCloud className="w-4 h-4 text-[#0088FF]" />
            <span>Restore from File</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLocalBackup}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#23324A] text-slate-300 hover:text-white border border-[#334155] text-xs font-bold transition-all disabled:opacity-50 touch-target"
          >
            <Download className="w-4 h-4" />
            <span>Download Local JSON</span>
          </button>

          <button
            type="button"
            onClick={handlePushR2Backup}
            disabled={isUploadingR2}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF7900] to-[#E66C00] hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-[#FF7900]/25 transition-all active:scale-95 disabled:opacity-50 touch-target"
          >
            {isUploadingR2 ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading to R2...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>Push Backup to Cloudflare R2</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cloudflare R2 Real-Time Status Card */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF7900]/15 flex items-center justify-center text-[#FF7900]">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-heading">Cloudflare R2 Storage Status</h2>
              <p className="text-[10px] text-slate-400">Target Bucket: <span className="font-mono text-[#0088FF]">ucr-portal-assets</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                r2Status === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : r2Status === 'in_progress'
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse'
                  : r2Status === 'failed'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  r2Status === 'success'
                    ? 'bg-emerald-400'
                    : r2Status === 'in_progress'
                    ? 'bg-amber-400 animate-ping'
                    : r2Status === 'failed'
                    ? 'bg-rose-400'
                    : 'bg-slate-500'
                }`}
              />
              <span>
                {r2Status === 'success'
                  ? 'R2 Active & Verified'
                  : r2Status === 'in_progress'
                  ? 'Upload In Progress'
                  : r2Status === 'failed'
                  ? 'Backup Failed'
                  : 'Never Backed Up'}
              </span>
            </span>
          </div>
        </div>

        {r2Message && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{r2Message}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {restoreResult && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{restoreResult.message}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              Restored {restoreResult.restoredCounts?.students} students,{' '}
              {restoreResult.restoredCounts?.attendanceSessions} attendance sessions, and{' '}
              {restoreResult.restoredCounts?.assignments} assignments.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A]">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Latest Snapshot</span>
            <span className="text-sm font-black text-white mt-1 block truncate font-mono">
              {lastR2Backup ? lastR2Backup.filename : 'No snapshots'}
            </span>
            <span className="text-[10px] text-[#0088FF]">Cloudflare R2</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A]">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">File Size</span>
            <span className="text-lg font-black text-white mt-1 block">
              {lastR2Backup ? lastR2Backup.size : '0 KB'}
            </span>
            <span className="text-[10px] text-emerald-400">Full Database JSON</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A]">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Last Successful Backup</span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              {lastR2Backup ? new Date(lastR2Backup.lastModified).toLocaleDateString() : 'Never'}
            </span>
            <span className="text-[10px] text-[#FF7900]">
              {lastR2Backup ? new Date(lastR2Backup.lastModified).toLocaleTimeString() : ''}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A]">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Online Copies</span>
            <span className="text-lg font-black text-white mt-1 block">{r2Backups.length} Snapshots</span>
            <span className="text-[10px] text-slate-400">Available to restore</span>
          </div>
        </div>
      </div>

      {/* Online Snapshots Available in Cloudflare R2 */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0088FF]" />
            <h2 className="text-sm font-bold text-white font-heading">Cloudflare R2 Stored Snapshots</h2>
          </div>
          <button
            type="button"
            onClick={fetchR2Backups}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 touch-target"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh R2 List</span>
          </button>
        </div>

        {r2Backups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No snapshots in Cloudflare R2 yet. Click &quot;Push Backup to Cloudflare R2&quot; above to create your first cloud backup.
          </div>
        ) : (
          <div className="space-y-2">
            {r2Backups.map((bk, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#161F30] border border-[#23324A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0088FF]/15 flex items-center justify-center text-[#0088FF] flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono text-white font-bold">{bk.filename}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Created: {new Date(bk.lastModified).toLocaleString()} · Size: {bk.size} {bk.etag ? `· ETag: ${bk.etag}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDownloadR2(bk.key, bk.filename)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#23324A] text-slate-300 hover:text-white text-xs font-bold border border-[#334155] transition-colors touch-target"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedR2Key(bk.key);
                      setRestoreSourceType('r2');
                      setConfirmRestoreOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF7900]/15 hover:bg-[#FF7900]/25 text-[#FF7900] text-xs font-bold border border-[#FF7900]/30 transition-colors touch-target"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore this</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {confirmRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#FF7900]">
              <div className="w-10 h-10 rounded-xl bg-[#FF7900]/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#FF7900]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Confirm System Recovery</h3>
                <p className="text-xs text-slate-400">Zero-loss rollback & data synchronization</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to restore the system state from{' '}
              <strong className="text-white font-mono">
                {restoreSourceType === 'upload' ? 'Uploaded JSON File' : selectedR2Key}
              </strong>
              . This will synchronize student records, timetables, and attendance logs to this snapshot state.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setConfirmRestoreOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/20 active:scale-95 disabled:opacity-50"
              >
                {isRestoring ? 'Restoring System...' : 'Yes, Restore Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
