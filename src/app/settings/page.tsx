'use client';

import React from 'react';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { CareerSection } from '@/components/settings/CareerSection';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import { PrivacyControls } from '@/components/settings/PrivacyControls';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-sm text-zinc-500">Manage your profile, career preferences, and account.</p>
      </div>
      <ProfileSection />
      <CareerSection />
      <PrivacyControls />
      <DeleteAccountSection />
    </div>
  );
}
