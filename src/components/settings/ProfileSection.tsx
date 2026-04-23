'use client';

import React, { useEffect, useState } from 'react';
import * as Icons from '@radix-ui/react-icons';
import { useAuthStore } from '@/store/auth-store';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';

export const ProfileSection = () => {
  const { user, fetchCurrentUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      const updated = await api.patch<{ id: number; email: string; name?: string; bio?: string }>("/auth/me", {
        name,
        bio,
      });
      
      await fetchCurrentUser();
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Profile Information</h2>
        <p className="text-sm text-zinc-500">How your info appears to recruiters.</p>
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

      <div className="p-8 space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-orange-200 border-4 border-zinc-800 overflow-hidden">
              <img 
                src={`https://avatar.iran.liara.run/public/boy?username=${name || 'user'}`} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-[#00f29c] rounded-full border-2 border-zinc-900 shadow-xl group-hover:scale-110 transition-transform">
              <Icons.Pencil1Icon className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
          <div>
            <h3 className="font-bold text-white mb-0.5 text-[15px]">Profile Photo</h3>
            <p className="text-xs text-zinc-500 mb-4">JPG, GIF or PNG. Max size 2MB.</p>
            <div className="flex items-center gap-3">
              <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors">
                Upload new
              </button>
              <button className="px-4 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Professional Bio</label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all resize-none"
            placeholder="Tell recruiters about yourself..."
          />
        </div>

        {/* Subscription Section */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Subscription Plan</h3>
              <p className="text-xs text-zinc-500">Manage your subscription</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              user?.subscription_plan === 'pro'
                ? 'bg-primary text-black'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {user?.subscription_plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </div>
          </div>

          {user?.subscription_plan !== 'pro' && (
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Upgrade to Pro</h4>
                  <p className="text-xs text-zinc-500">Unlock all premium features for $19/month</p>
                </div>
                <Link href="/payment?plan=pro">
                  <button className="px-4 py-2 bg-primary text-black font-bold text-xs rounded-lg hover:opacity-90 transition-all">
                    Upgrade
                  </button>
                </Link>
              </div>
            </div>
          )}

          {user?.subscription_plan === 'pro' && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">Pro Plan Active</h4>
                  <p className="text-xs text-zinc-400">Your subscription is active and auto-renews</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 pt-0 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};