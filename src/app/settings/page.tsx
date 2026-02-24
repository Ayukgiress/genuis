'use client';

import React from 'react';
import { Header } from '@/components/settings/Header';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { CareerSection } from '@/components/settings/CareerSection';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import { Footer } from '@/components/settings/Footer';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00f29c]/30">
      <Header />
      
      <main className="max-w-[1200px] mx-auto px-8 py-12 flex gap-16">
        <SettingsSidebar />
        
        <div className="flex-1 max-w-[800px]">
          <ProfileSection />
          <CareerSection />
          <DeleteAccountSection />
          <Footer />
        </div>
      </main>
    </div>
  );
}
