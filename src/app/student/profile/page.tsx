'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Check,
  Lock,
  LogOut,
  AlertCircle,
  Sparkles,
  Camera,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Student } from '@/types';

export default function StudentProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarStorageType, setAvatarStorageType] = useState<string | null>(null);

  // Editable Form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [parentGuardianName, setParentGuardianName] = useState('');
  const [parentGuardianPhone, setParentGuardianPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/student/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.student) {
          setStudent(d.student);
          setPhoneNumber(d.student.phoneNumber || '');
          setEmail(d.student.email || '');
          setResidentialAddress(d.student.residentialAddress || '');
          setParentGuardianName(d.student.parentGuardianName || '');
          setParentGuardianPhone(d.student.parentGuardianPhone || '');
          setEmergencyContact(d.student.emergencyContact || '');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image exceeds maximum allowed size of 5MB. Please choose a smaller photo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    setSaveMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (student?.id) {
      formData.append('studentId', student.id);
    }

    try {
      const res = await fetch('/api/student/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setStudent((prev) => (prev ? { ...prev, profileImageUrl: data.url } : null));
        setAvatarStorageType(data.storageType || 'r2');
        setSaveMessage(
          `Profile photo successfully uploaded and synchronized with ${
            data.storageType === 'r2'
              ? 'Cloudflare R2'
              : data.storageType === 'supabase'
              ? 'Supabase Storage'
              : 'Local Storage'
          }!`
        );
      } else {
        setErrorMessage(data.error || 'Failed to upload photo.');
      }
    } catch (err) {
      setErrorMessage('Network connection error while uploading photo.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student?.id,
          studentNumber: student?.studentNumber,
          profileImageUrl: '',
        }),
      });
      if (res.ok) {
        setStudent((prev) => (prev ? { ...prev, profileImageUrl: undefined } : null));
        setSaveMessage('Profile photo removed.');
      }
    } catch (e) {
      setErrorMessage('Failed to remove photo.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student?.id,
          studentNumber: student?.studentNumber,
          phoneNumber,
          email,
          residentialAddress,
          parentGuardianName,
          parentGuardianPhone,
          emergencyContact,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveMessage('Profile contact details updated successfully! Official academic details remain locked.');
        if (data.student) setStudent(data.student);
      } else {
        setErrorMessage(data.error || 'Failed to update details.');
      }
    } catch (err) {
      setErrorMessage('Network connection error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ucr_user_role');
    }
    router.push('/login');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#0088FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 font-heading">
          <div className="w-9 h-9 rounded-xl bg-[#0088FF]/20 text-[#0088FF] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span>Student Profile & Contacts</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your enrolled academic records and keep personal contact details updated
        </p>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Profile Card in Dark Slate */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Profile Avatar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-4">
            <div className="relative group flex-shrink-0">
              {student?.profileImageUrl ? (
                <img
                  src={student.profileImageUrl}
                  alt={student.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#FF7900] shadow-xl"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#FF7900] flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  {student?.fullName ? student.fullName.slice(0, 2).toUpperCase() : 'ST'}
                </div>
              )}

              {/* Upload Trigger on Avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 touch-target"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[9px] font-bold">Upload</span>
              </button>
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-black text-white truncate font-heading">{student?.fullName}</h2>
              <div className="text-xs font-mono font-bold text-[#FF7900]">{student?.studentNumber}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {student?.course === 'TPOPT' ? 'Post Production Technology' : 'Studio Production Technology'} · Batch 11 (2026 Intake)
              </div>
              {student?.profileImageUrl && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {avatarStorageType === 'r2'
                      ? 'Cloudflare R2 Synced'
                      : avatarStorageType === 'supabase'
                      ? 'Supabase Storage Synced'
                      : 'Storage Synced'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Avatar Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0088FF] hover:bg-[#0072D6] text-white text-xs font-bold shadow-md shadow-[#0088FF]/20 transition-all active:scale-95 disabled:opacity-50 touch-target"
            >
              {isUploadingAvatar ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading to R2...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>{student?.profileImageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </>
              )}
            </button>

            {student?.profileImageUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="p-2 rounded-xl bg-[#161F30] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#23324A] hover:border-rose-500/30 transition-all touch-target"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LOCKED OFFICIAL ACADEMIC IDENTITY (Read-only with Lock Icons) */}
        <div className="p-4 rounded-xl bg-[#161F30] border border-[#23324A] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Academic Identity (Locked)</span>
            </span>
            <span className="text-[10px] text-amber-400/90 font-medium">Read-only institutional records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Student Index No</span>
              <div className="font-mono font-bold text-white mt-0.5">{student?.studentNumber}</div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Official Registered Name</span>
              <div className="font-bold text-white mt-0.5 truncate">{student?.fullName}</div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Academic Programme</span>
              <div className="font-bold text-[#0088FF] mt-0.5">{student?.course}</div>
            </div>
          </div>
        </div>

        {/* EDITABLE PERSONAL CONTACT DETAILS */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#FF7900] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Update Personal & Emergency Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Personal Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +94 77 123 4567"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Personal Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Residential Address (Hostel / Home)
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3.5 pointer-events-none text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={residentialAddress}
                onChange={(e) => setResidentialAddress(e.target.value)}
                placeholder="Hostel room or permanent residential address"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Parent / Guardian Name
              </label>
              <input
                type="text"
                value={parentGuardianName}
                onChange={(e) => setParentGuardianName(e.target.value)}
                placeholder="Parent or guardian full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Parent / Guardian Phone
              </label>
              <input
                type="text"
                value={parentGuardianPhone}
                onChange={(e) => setParentGuardianPhone(e.target.value)}
                placeholder="e.g. +94 71 987 6543"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Emergency Contact Details
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. Uncle / Sibling phone number"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#23324A] text-white focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-xs font-bold shadow-lg shadow-[#FF7900]/25 transition-all active:scale-95 disabled:opacity-50 mt-2"
          >
            {isSaving ? 'Updating Profile...' : 'Save Updated Details'}
          </button>
        </form>

        {/* Logout Section */}
        <div className="pt-4 border-t border-[#1E293B]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-bold border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
