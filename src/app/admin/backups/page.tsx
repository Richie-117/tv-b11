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
} from 'lucide-react';

export default function AdminBackupsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [onlineBackups, setOnlineBackups] = useState<any[]>([]);
  const [backupResult, setBackupResult] = useState<any>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // File upload ref for manual JSON recovery
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadedSnapshot, setUploadedSnapshot] = useState<any | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [restoreSourceType, setRestoreSourceType] = useState<'upload' | 'online'>('upload');
  const [selectedOnlineFile, setSelectedOnlineFile] = useState<string>('');

  const fetchOnlineBackups = async () => {
    try {
      const res = await fetch('/api/admin/backup?action=list');
      if (res.ok) {
        const d = await res.json();
        setOnlineBackups(d.onlineBackups || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchOnlineBackups();
  }, []);

  // 1. Local Backup Download
  const handleDownloadLocalBackup = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backup');
      if (res.ok) {
        const data = await res.json();
        setBackupResult(data);

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

        fetchOnlineBackups();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to generate backup.');
      }
    } catch (e) {
      setError('Connection error generating backup.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Handle File Upload for Restore
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

  // 3. Trigger Restore
  const executeRestore = async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const payload: any = {};
      if (restoreSourceType === 'upload') {
        payload.snapshot = uploadedSnapshot;
      } else {
        payload.onlineFilename = selectedOnlineFile;
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
            <HardDrive className="w-6 h-6 text-brand-purple" />
            <span>Disaster Backups & System Recovery</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Local JSON downloads, online cloud snapshots, and roll-back recovery options
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-lighter hover:bg-surface-lighter/80 text-white border border-surface-border text-xs font-bold transition-all touch-target"
          >
            <UploadCloud className="w-4 h-4 text-brand-cyan" />
            <span>Restore from File</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadLocalBackup}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-50 touch-target"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Snapshot...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Create Local & Online Backup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {restoreResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>{restoreResult.message}</span>
          </div>
          <div className="text-[11px] text-text-secondary">
            Restored {restoreResult.restoredCounts?.students} students and{' '}
            {restoreResult.restoredCounts?.attendanceSessions} attendance sessions.
          </div>
        </div>
      )}

      {/* Scope Card */}
      <div className="bg-surface/90 border border-surface-border rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-purple" />
            <span>Backup Data Scope & Recovery Verification</span>
          </h2>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple font-bold">
            SuperAdmin Clearance
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
            <span className="text-[10px] text-text-muted uppercase block font-bold">Students Record</span>
            <span className="text-lg font-black text-white mt-1 block">48 Verified</span>
            <span className="text-[10px] text-brand-cyan">TPOPT & TPRPT</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
            <span className="text-[10px] text-text-muted uppercase block font-bold">Attendance</span>
            <span className="text-lg font-black text-white mt-1 block">Full Logs</span>
            <span className="text-[10px] text-emerald-400">Sessions & Records</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
            <span className="text-[10px] text-text-muted uppercase block font-bold">Timetables</span>
            <span className="text-lg font-black text-white mt-1 block">140 Slots</span>
            <span className="text-[10px] text-brand-orange">Foundation 2026</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
            <span className="text-[10px] text-text-muted uppercase block font-bold">Audit History</span>
            <span className="text-lg font-black text-white mt-1 block">Complete</span>
            <span className="text-[10px] text-text-muted">Security Trails</span>
          </div>
        </div>
      </div>

      {/* Online Snapshots Available on Server */}
      <div className="bg-surface/90 border border-surface-border rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-brand-cyan" />
            <h2 className="text-sm font-bold text-white">Online Stored Snapshots</h2>
          </div>
          <button
            type="button"
            onClick={fetchOnlineBackups}
            className="text-xs text-text-muted hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {onlineBackups.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">
            No online server snapshots saved yet. Tap &quot;Create Local &amp; Online Backup&quot; to generate one.
          </div>
        ) : (
          <div className="space-y-2">
            {onlineBackups.map((bk, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-brand-cyan" />
                  <div>
                    <div className="font-mono text-white font-bold">{bk.filename}</div>
                    <div className="text-[10px] text-text-muted">
                      Created: {new Date(bk.createdAt).toLocaleString()} · Size: {bk.size}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOnlineFile(bk.filename);
                    setRestoreSourceType('online');
                    setConfirmRestoreOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface-lighter hover:bg-surface-lighter/80 text-brand-cyan text-xs font-bold border border-surface-border transition-colors touch-target"
                >
                  Restore this
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {confirmRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-brand-orange">
              <div className="w-10 h-10 rounded-xl bg-brand-orange/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Confirm System Recovery</h3>
                <p className="text-xs text-text-muted">Database rollback & synchronization</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              You are about to restore the system from{' '}
              <strong className="text-white">
                {restoreSourceType === 'upload' ? 'Uploaded JSON File' : selectedOnlineFile}
              </strong>
              . This will synchronize student records, timetables, and attendance logs to the backup snapshot state.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setConfirmRestoreOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold shadow disabled:opacity-50"
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
