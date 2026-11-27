'use client';

import React, { useState } from 'react';
import * as Icons from '@radix-ui/react-icons';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { CareerSection } from '@/components/settings/CareerSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';
import { PrivacyControls } from '@/components/settings/PrivacyControls';
import { BillingSection } from '@/components/settings/BillingSection';
import { DataExportSection } from '@/components/settings/DataExportSection';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';

const tabs = [
  { id: 'profile', label: 'Profile', icon: Icons.PersonIcon },
  { id: 'career', label: 'Career', icon: Icons.TargetIcon },
  { id: 'security', label: 'Security', icon: Icons.LockClosedIcon },
  { id: 'notifications', label: 'Notifications', icon: Icons.BellIcon },
  { id: 'appearance', label: 'Appearance', icon: Icons.SunIcon },
  { id: 'integrations', label: 'Integrations', icon: Icons.Link1Icon },
  { id: 'billing', label: 'Billing', icon: Icons.CardStackIcon },
  { id: 'privacy', label: 'Privacy & Data', icon: Icons.EyeClosedIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your profile, preferences, and account.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 pb-0 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-[#00f29c] text-[#00f29c]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'career' && <CareerSection />}
        {activeTab === 'security' && <SecuritySection />}
        {activeTab === 'notifications' && <NotificationsSection />}
        {activeTab === 'appearance' && <AppearanceSection />}
        {activeTab === 'integrations' && <IntegrationsSection />}
        {activeTab === 'billing' && <BillingSection />}
        {activeTab === 'privacy' && (
          <div className="space-y-8">
            <PrivacyControls />
            <DataExportSection />
            <DeleteAccountSection />
          </div>
        )}
      </div>
    </div>
  );
}
