'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from '@radix-ui/react-icons';
import { authApi, ApiError } from '@/lib/api';

interface NotificationPreferences {
  email_job_matches: boolean;
  email_application_updates: boolean;
  email_interview_reminders: boolean;
  email_weekly_digest: boolean;
  email_marketing: boolean;
  push_job_matches: boolean;
  push_application_updates: boolean;
  push_interview_reminders: boolean;
  push_messages: boolean;
}

export const NotificationsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_job_matches: true,
    email_application_updates: true,
    email_interview_reminders: true,
    email_weekly_digest: false,
    email_marketing: false,
    push_job_matches: true,
    push_application_updates: true,
    push_interview_reminders: true,
    push_messages: true,
  });

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const userData = await authApi.getMe();
      const profile = userData.career_profile || userData.career_preferences || {};
      if (profile.notifications) {
        setPrefs(prev => ({ ...prev, ...profile.notifications }));
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      await authApi.updateCareerProfile({
        ...prefs,
        notifications: prefs,
      });

      setSuccess('Notification preferences saved successfully!');
      await loadPreferences();
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save preferences');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-8 pb-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-1">Notifications</h2>
          <p className="text-sm text-zinc-500">Configure how you receive updates.</p>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const notificationGroups = [
    {
      title: 'Email Notifications',
      description: 'Receive updates via email',
      items: [
        { key: 'email_job_matches', label: 'Job matches', description: 'New roles matching your preferences' },
        { key: 'email_application_updates', label: 'Application updates', description: 'Status changes on your applications' },
        { key: 'email_interview_reminders', label: 'Interview reminders', description: 'Upcoming interview sessions' },
        { key: 'email_weekly_digest', label: 'Weekly digest', description: 'Weekly summary of your activity' },
        { key: 'email_marketing', label: 'Marketing emails', description: 'Product updates and tips' },
      ] as const,
    },
    {
      title: 'Push Notifications',
      description: 'Receive real-time updates in the app',
      items: [
        { key: 'push_job_matches', label: 'Job matches', description: 'Instant alerts for new matching roles' },
        { key: 'push_application_updates', label: 'Application updates', description: 'Real-time status changes' },
        { key: 'push_interview_reminders', label: 'Interview reminders', description: 'Session start notifications' },
        { key: 'push_messages', label: 'Messages', description: 'New messages and replies' },
      ] as const,
    },
  ];

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Notifications</h2>
        <p className="text-sm text-zinc-500">Configure how you receive updates.</p>
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
        {notificationGroups.map((group) => (
          <div key={group.title} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">{group.title}</h3>
              <p className="text-xs text-zinc-500">{group.description}</p>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <label
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4 cursor-pointer hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{item.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{item.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs[item.key]}
                    onChange={() => handleToggle(item.key)}
                    className="mt-1 h-4 w-4 accent-[#00f29c] shrink-0"
                    aria-label={`Enable ${item.label}`}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-6 border-t border-zinc-800/70">
          <p className="text-xs text-zinc-500 mb-4">
            <Icons.InfoCircledIcon className="inline w-3 h-3 mr-1" /> Push notifications require browser permission.{" "}
            <button
              type="button"
              onClick={() => Notification.requestPermission()}
              className="text-primary hover:underline text-xs font-bold"
            >
              Enable now
            </button>
          </p>
        </div>
      </div>

      <div className="p-8 pt-0 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#00f29c]/40"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  );
};