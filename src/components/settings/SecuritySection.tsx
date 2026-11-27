'use client';

import React, { useState } from 'react';
import * as Icons from '@radix-ui/react-icons';
import { authApi, ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export const SecuritySection = () => {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'password' | '2fa' | 'sessions'>('password');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      // Mock data for sessions - in real app, fetch from API
      const mockSessions: Session[] = [
        {
          id: 'current',
          device: 'MacBook Pro',
          browser: 'Chrome 120.0',
          os: 'macOS 14.2',
          location: 'San Francisco, CA',
          lastActive: 'Just now',
          current: true,
        },
        {
          id: 'sess_1',
          device: 'iPhone 15',
          browser: 'Safari 17.2',
          os: 'iOS 17.2',
          location: 'San Francisco, CA',
          lastActive: '2 hours ago',
          current: false,
        },
        {
          id: 'sess_2',
          device: 'Windows PC',
          browser: 'Firefox 121.0',
          os: 'Windows 11',
          location: 'New York, NY',
          lastActive: '3 days ago',
          current: false,
        },
      ];
      setSessions(mockSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  React.useEffect(() => {
    loadSessions();
  }, []);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await authApi.updateMe({ password: newPassword } as any);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully!');
    } catch (err) {
      console.error('Failed to update password:', err);
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setIsSettingUp2FA(true);
      // In real app, call API to generate QR code
      // const { qr_code, backup_codes } = await authApi.setup2FA();
      // For demo, generate mock QR code
      setQrCode('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzAwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDBmMjljIiBmb250LXNpemU9IjI0Ij5RUiBDb2RlPC90ZXh0Pjwvc3ZnPg==');
      setBackupCodes([
        'A1B2-C3D4',
        'E5F6-G7H8',
        'I9J0-K1L2',
        'M3N4-O5P6',
        'Q7R8-S9T0',
        'U1V2-W3X4',
        'Y5Z6-A7B8',
        'C9D0-E1F2',
        'G3H4-I5J6',
        'K7L8-M9N0',
      ]);
    } catch (err) {
      console.error('Failed to setup 2FA:', err);
      setError('Failed to setup 2FA');
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    try {
      // await authApi.verify2FA(twoFACode);
      setIs2FAEnabled(true);
      setSuccess('Two-factor authentication enabled!');
      setTwoFACode('');
      setQrCode(null);
    } catch (err) {
      console.error('Failed to verify 2FA:', err);
      setError('Invalid code. Please try again.');
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    try {
      // await authApi.disable2FA();
      setIs2FAEnabled(false);
      setSuccess('Two-factor authentication disabled');
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
      setError('Failed to disable 2FA');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionId === 'current') return;
    if (!window.confirm('Are you sure you want to revoke this session?')) return;

    try {
      setRevokingSession(sessionId);
      // await authApi.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSuccess('Session revoked successfully');
    } catch (err) {
      console.error('Failed to revoke session:', err);
      setError('Failed to revoke session');
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('This will sign you out of all devices except this one. Continue?')) return;

    try {
      // await authApi.revokeAllSessions();
      setSessions(prev => prev.filter(s => s.current));
      setSuccess('All other sessions revoked');
    } catch (err) {
      console.error('Failed to revoke sessions:', err);
      setError('Failed to revoke sessions');
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('This will sign you out everywhere including this device. Continue?')) return;

    try {
      await logout();
      router.replace('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
      setError('Failed to logout');
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-primary', 'bg-primary'];

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Security</h2>
        <p className="text-sm text-zinc-500">Manage your password, two-factor authentication, and active sessions.</p>
      </div>

      {error && (
        <div className="mx-8 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-8 mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800 mx-8">
        {[
          { id: 'password', label: 'Password', icon: Icons.LockClosedIcon },
          { id: '2fa', label: 'Two-Factor Auth', icon: Icons.LockClosedIcon },
          { id: 'sessions', label: 'Active Sessions', icon: Icons.DesktopIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as typeof activeTab); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="max-w-md space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Change Password</h3>
              <p className="text-xs text-zinc-500">Your password should be at least 8 characters.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
                  placeholder="Enter new password"
                />
                {newPassword && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColors[strength - 1] || 'bg-zinc-800'} transition-all duration-300`}
                        style={{ width: `${(strength / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500">Strength: {strengthLabels[strength - 1] || 'Very weak'}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        )}

        {/* 2FA Tab */}
        {activeTab === '2fa' && (
          <div className="max-w-2xl space-y-6">
            {!is2FAEnabled && !isSettingUp2FA && !qrCode ? (
              <div className="space-y-4">
                <div className="p-6 rounded-xl border border-zinc-800 bg-black/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                      <Icons.LockClosedIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Enable Two-Factor Authentication</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Add an extra layer of security to your account. You&apos;ll need to enter a code from your authenticator app when signing in.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSetup2FA}
                  disabled={isSettingUp2FA}
                  className="w-full px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSettingUp2FA ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Set Up 2FA'
                  )}
                </button>
              </div>
            ) : !is2FAEnabled && qrCode ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">Scan QR Code</h3>
                  <p className="text-xs text-zinc-500">Use your authenticator app (Google Authenticator, Authy, 1Password) to scan this code.</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-xl">
                    <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                    <p className="text-xs text-zinc-500">Can&apos;t scan? Enter this key manually:</p>
                    <code className="block mt-2 text-sm font-mono text-white tracking-wider">JBSWY3DPEHPK3PXP</code>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Enter 6-digit code</label>
                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="w-full max-w-xs bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all text-center tracking-widest font-mono"
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerify2FA}
                    className="flex-1 px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all"
                  >
                    Verify & Enable
                  </button>
                  <button
                    onClick={() => { setQrCode(null); setTwoFACode(''); }}
                    className="flex-1 px-6 py-2.5 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                </div>

                {showBackupCodes && (
                  <div className="space-y-3 pt-6 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">Backup Codes</h4>
                      <button
                        onClick={() => { setShowBackupCodes(false); navigator.clipboard.writeText(backupCodes.join('\n')); setSuccess('Backup codes copied!'); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Copy all
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">Save these codes in a safe place. Each can be used once to access your account if you lose your authenticator.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <code key={i} className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm font-mono text-white text-center">
                          {code}
                        </code>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowBackupCodes(true)}
                      className="w-full px-4 py-2 text-xs font-bold text-primary hover:underline"
                    >
                      I&apos;ve saved these codes
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Icons.LockClosedIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Two-Factor Authentication Enabled</h3>
                      <p className="mt-1 text-sm text-zinc-500">Your account is protected with 2FA.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBackupCodes(true)}
                    className="px-6 py-2.5 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
                  >
                    <Icons.LockClosedIcon className="w-4 h-4 mr-2" />
                    View Backup Codes
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    className="px-6 py-2.5 border border-red-500/30 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/10 transition-all"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Active Sessions</h3>
                <p className="text-xs text-zinc-500">Manage devices signed into your account.</p>
              </div>
              <button
                onClick={handleRevokeAllSessions}
                disabled={sessions.filter(s => !s.current).length === 0}
                className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revoke All Other Sessions
              </button>
            </div>

            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                      session.current
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-zinc-800 bg-black/30 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
                        <Icons.DesktopIcon className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white truncate">{session.device}</h4>
                          {session.current && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-tighter">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{session.browser} on {session.os}</p>
                        <p className="text-xs text-zinc-500">{session.location} · {session.lastActive}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSession === session.id}
                        className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Icons.ExitIcon className="w-3 h-3" />
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-zinc-800/70">
              <button
                onClick={handleLogoutAll}
                className="w-full px-6 py-2.5 border border-red-500/30 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Icons.ExitIcon className="w-4 h-4" />
                Sign Out Everywhere
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};