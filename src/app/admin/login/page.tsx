'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, AlertCircle, Tv, KeyRound, CheckCircle2, Sparkles } from 'lucide-react';
import { clearPortalCache } from '@/lib/portalCache';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'activate'>('signin');

  // Sign In Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Activation Form State
  const [studentIndex, setStudentIndex] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [activateSuccess, setActivateSuccess] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Auto-restore saved login details & check if already authenticated
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('ucr_saved_login_user');
      if (savedUser) {
        setUsername(savedUser);
      }
      const savedRemember = localStorage.getItem('ucr_remember_me');
      if (savedRemember !== null) {
        setRememberMe(savedRemember === 'true');
      }

      // If already logged in, redirect directly without showing login form
      fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.authenticated && data?.user) {
            if (data.user.role === 'student') {
              router.replace('/student');
            } else {
              router.replace('/admin');
            }
          }
        })
        .catch(() => {});
    }
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide your username or student index and password.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Please verify your credentials.');
      } else {
        clearPortalCache();
        if (typeof window !== 'undefined') {
          localStorage.setItem('ucr_user_role', data.user?.role || 'admin');
          if (rememberMe) {
            localStorage.setItem('ucr_saved_login_user', username.trim());
            localStorage.setItem('ucr_remember_me', 'true');
          } else {
            localStorage.removeItem('ucr_saved_login_user');
            localStorage.setItem('ucr_remember_me', 'false');
          }
        }

        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        } else if (data.user?.role === 'student') {
          router.push('/student');
        } else {
          router.push('/admin');
        }
        router.refresh();
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIndex || !invitationCode || !newPassword) {
      setError('All fields are required to activate your student account.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setIsActivating(true);

    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: studentIndex,
          invitationCode,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Account activation failed. Check your invitation code.');
      } else {
        const isRep = Boolean(data.student?.isRepresentative || data.redirectUrl === '/admin');
        clearPortalCache();
        setActivateSuccess(data.message || 'Account activated successfully!');
        if (typeof window !== 'undefined') {
          localStorage.setItem('ucr_user_role', isRep ? 'representative' : 'student');
          localStorage.setItem('ucr_saved_login_user', studentIndex.trim());
          localStorage.setItem('ucr_remember_me', 'true');
        }
        setTimeout(() => {
          if (data.redirectUrl) {
            router.push(data.redirectUrl);
          } else if (isRep) {
            router.push('/admin');
          } else {
            router.push('/student');
          }
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      setError('Network connection error during activation.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background glow in Blue & Orange */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#0088FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#FF7900]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0088FF] to-[#FF7900] shadow-lg shadow-[#0088FF]/20 mb-3">
            <Tv className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
            Division of Television Studies
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Batch 11 (2026 Intake) · University College of Rathmalana
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0A0E17] border border-[#1E293B] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'signin'
                  ? 'bg-[#FF7900] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('activate');
                setError('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'activate'
                  ? 'bg-[#0088FF] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Activate Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activateSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{activateSuccess}</span>
            </div>
          )}

          {activeTab === 'signin' ? (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Username or Student Index Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. RT/TPOPT/26/01 or username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#161F30] border border-[#23324A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7900] focus:ring-1 focus:ring-[#FF7900] transition-all touch-target"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#161F30] border border-[#23324A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF7900] focus:ring-1 focus:ring-[#FF7900] transition-all touch-target"
                    required
                  />
                </div>
              </div>

              {/* Remember Me / Save Login Details */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#161F30] border-[#23324A] text-[#FF7900] focus:ring-[#FF7900] focus:ring-offset-0 focus:ring-1 cursor-pointer accent-[#FF7900]"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Save login details on this device
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#E66C00] text-white text-sm font-bold shadow-lg shadow-[#FF7900]/25 transition-all active:scale-[0.98] disabled:opacity-50 touch-target mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('activate');
                    setError('');
                  }}
                  className="text-xs text-slate-400 hover:text-[#0088FF] transition-colors inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#0088FF]" />
                  <span>New student with invitation code? <strong className="text-[#0088FF] underline underline-offset-2">Activate account</strong></span>
                </button>
              </div>
            </form>
          ) : (
            /* Student Account Activation Form */
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#0088FF]/10 border border-[#0088FF]/20 text-xs text-slate-300">
                <span className="font-bold text-[#38BDF8]">First Time Student?</span> Enter your official index number and the 30-day invitation code provided by your Batch Representative.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Official Student Index Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={studentIndex}
                    onChange={(e) => setStudentIndex(e.target.value)}
                    placeholder="e.g. RT/TPOPT/26/01"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#161F30] border border-[#23324A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF] transition-all touch-target font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Invitation Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="e.g. UCR-2026-TPOPT-7721"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#161F30] border border-[#23324A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF] transition-all touch-target font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Create Private Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#161F30] border border-[#23324A] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF] transition-all touch-target"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isActivating}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#0088FF] hover:bg-[#0072D6] text-white text-sm font-bold shadow-lg shadow-[#0088FF]/25 transition-all active:scale-[0.98] disabled:opacity-50 touch-target mt-2"
              >
                {isActivating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Activate & Sign In</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setError('');
                  }}
                  className="text-xs text-slate-400 hover:text-[#FF7900] transition-colors"
                >
                  Already activated your account? <strong className="text-[#FF7900] underline underline-offset-2">Sign in here</strong>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Minimal friendly footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Authorized Academic Staff, Representatives & Students · UCR TV Studies
        </p>
      </div>
    </div>
  );
}
