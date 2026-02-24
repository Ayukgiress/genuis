import React from 'react';
import * as Icons from '@radix-ui/react-icons';

const NavItem = ({ icon: Icon, label, active = false }: { icon: React.ComponentType<{ className?: string }>, label: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
    active 
      ? 'bg-zinc-900 text-[#00f29c]' 
      : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
  }`}>
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export const SettingsSidebar = () => {
  return (
    <aside className="w-64 flex flex-col gap-8 shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Manage your account and preferences.
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        <NavItem icon={Icons.PersonIcon} label="Profile" active />
        <NavItem icon={Icons.AvatarIcon} label="Account" />
        <NavItem icon={Icons.BellIcon} label="Notifications" />
        <NavItem icon={Icons.CardStackPlusIcon} label="Career Preferences" />
      </nav>

      <div className="mt-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <span className="text-[10px] font-bold text-[#00f29c] uppercase tracking-wider">Pro Plan</span>
        <p className="text-xs text-zinc-400 mt-2 mb-4 leading-relaxed">
          Your subscription renews on Oct 12, 2023.
        </p>
        <button className="text-xs font-bold text-[#00f29c] hover:underline transition-all">
          Manage Billing
        </button>
      </div>
    </aside>
  );
};
