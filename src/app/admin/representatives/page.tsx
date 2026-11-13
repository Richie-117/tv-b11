'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Shield,
  Key,
  Check,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { AdminUser, ALL_ADMIN_PERMISSIONS } from '@/types';

export default function AdminRepresentativesPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/representatives');
      if (res.ok) {
        const d = await res.json();
        setAdmins(d.admins || []);
      } else {
        const err = await res.json();
        setError(err.error || 'Access restricted to Super Administrators.');
      }
    } catch (e) {
      setError('Connection error loading representatives.');
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleOpenPermissions = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditingPermissions(admin.permissions || []);
    setSuccessMsg(null);
  };

  const togglePermission = (code: string) => {
    setEditingPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedAdmin) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/representatives', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAdmin.id,
          permissions: editingPermissions,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Permissions updated for ${selectedAdmin.name}!`);
        setAdmins((prev) =>
          prev.map((a) => (a.id === selectedAdmin.id ? { ...a, permissions: editingPermissions } : a))
        );
        setTimeout(() => setSelectedAdmin(null), 1200);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to update permissions.');
      }
    } catch (e) {
      setError('Connection error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
          <span>Batch Representatives & Admin Roles</span>
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Role-Based Access Control (RBAC) · Super Administrator console for student leaders
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {admins.map((admin) => {
          const isSuper = admin.role === 'superadmin';

          return (
            <div
              key={admin.id}
              className={`p-4 rounded-2xl border transition-all ${
                isSuper
                  ? 'bg-purple-950/20 border-purple-500/30 shadow-md'
                  : 'bg-surface/90 border-surface-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isSuper
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-ucr-orange/20 text-ucr-orange'
                    }`}
                  >
                    {isSuper ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{admin.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSuper
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-ucr-orange/20 text-ucr-orange border border-ucr-orange/30'
                        }`}
                      >
                        {isSuper ? 'Super Administrator' : admin.representativeRole || 'Representative'}
                      </span>
                    </h3>
                    <div className="text-xs font-mono text-text-muted">
                      Username: {admin.username} · {admin.email}
                    </div>
                  </div>
                </div>
              </div>

              {admin.representativeCourse && (
                <div className="text-xs text-text-secondary mt-1">
                  Programme Target: <strong className="text-white">{admin.representativeCourse}</strong>
                </div>
              )}

              {/* Permissions Summary & Edit Action */}
              <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between">
                <div className="text-[11px] text-text-muted">
                  {isSuper ? (
                    <span className="text-purple-300 font-semibold">Full Unrestricted System Access</span>
                  ) : (
                    <span>{admin.permissions?.length || 0} permissions assigned</span>
                  )}
                </div>

                {!isSuper && (
                  <button
                    type="button"
                    onClick={() => handleOpenPermissions(admin)}
                    className="px-3 py-1.5 rounded-xl bg-surface-lighter hover:bg-surface-lighter/80 text-white text-xs font-semibold border border-surface-border transition-colors touch-target"
                  >
                    Manage Scopes
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Modal */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface border border-surface-border rounded-2xl shadow-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-ucr-orange" />
              <span>Configure Permissions for {selectedAdmin.name}</span>
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Toggle specific scopes permitted for this Batch Representative
            </p>

            {successMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                {successMsg}
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {ALL_ADMIN_PERMISSIONS.filter((p) => p.code !== 'backups:manage' && p.code !== 'admins:manage').map(
                (perm) => {
                  const isChecked = editingPermissions.includes(perm.code);

                  return (
                    <div
                      key={perm.code}
                      onClick={() => togglePermission(perm.code)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-ucr-orange/15 border-ucr-orange/40 text-white'
                          : 'bg-surface-card border-surface-border text-text-muted'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{perm.name}</div>
                        <div className="text-[10px] text-text-muted">{perm.description}</div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                          isChecked ? 'bg-ucr-orange text-white' : 'bg-surface-lighter'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border mt-4">
              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-ucr-orange hover:bg-ucr-orange-hover text-white text-xs font-bold shadow"
              >
                {isSaving ? 'Saving...' : 'Apply Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

