'use client';

import React, { useEffect, useState } from 'react';
import * as Icons from '@radix-ui/react-icons';
import { api, ApiError } from '@/lib/api';

interface CareerPreferences {
  desired_roles?: string[];
  min_salary?: number;
  work_mode?: string;
  relocation?: boolean;
}

interface UserWithPreferences {
  id: number;
  email: string;
  name?: string;
  career_preferences?: CareerPreferences;
}

const Tag = ({ label, active = false, onRemove }: { label: string, active?: boolean, onRemove?: () => void }) => (
  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
    active 
      ? 'bg-[#00f29c]/10 border-[#00f29c]/30 text-[#00f29c]' 
      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
  }`}>
    {label}
    {onRemove && (
      <Icons.Cross2Icon className="w-3 h-3 cursor-pointer hover:text-white transition-colors" onClick={onRemove} />
    )}
  </div>
);

export const CareerSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [desiredRoles, setDesiredRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [workMode, setWorkMode] = useState('hybrid');
  const [relocation, setRelocation] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const userData = await api.get<UserWithPreferences>('/auth/me');
      
      if (userData.career_preferences) {
        const prefs = userData.career_preferences;
        setDesiredRoles(prefs.desired_roles || []);
        setMinSalary(prefs.min_salary?.toString() || '');
        setWorkMode(prefs.work_mode || 'hybrid');
        setRelocation(prefs.relocation || false);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = () => {
    if (newRole.trim() && !desiredRoles.includes(newRole.trim())) {
      setDesiredRoles([...desiredRoles, newRole.trim()]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (role: string) => {
    setDesiredRoles(desiredRoles.filter(r => r !== role));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      await api.patch("/auth/me", {
        career_preferences: {
          desired_roles: desiredRoles,
          min_salary: minSalary ? parseInt(minSalary.replace(/,/g, '')) : undefined,
          work_mode: workMode,
          relocation,
        },
      });
      
      setSuccess('Career preferences saved successfully!');
      await loadPreferences();
    } catch (err) {
      console.error('Failed to save career preferences:', err);
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
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden mt-8">
        <div className="p-8 pb-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-1">Career Preferences</h2>
          <p className="text-sm text-zinc-500">Tailor your job matches and recommendations.</p>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden mt-8">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Career Preferences</h2>
        <p className="text-sm text-zinc-500">Tailor your job matches and recommendations.</p>
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
        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Desired Roles</label>
          <div className="flex flex-wrap gap-2">
            {desiredRoles.map((role) => (
              <Tag key={role} label={role} active onRemove={() => handleRemoveRole(role)} />
            ))}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                placeholder="Add role..."
                className="w-24 bg-transparent border border-dashed border-zinc-700 rounded-full px-3 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
              />
              <button 
                onClick={handleAddRole}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-all"
              >
                <Icons.PlusIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Minimum Annual Salary</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <input
                type="text"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
                placeholder="120,000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Work Mode</label>
            <div className="relative">
              <select 
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all cursor-pointer"
              >
                <option value="remote">Fully Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
              <Icons.ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div 
          className="flex items-start gap-3 cursor-pointer"
          onClick={() => setRelocation(!relocation)}
        >
          <div className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
            relocation ? 'bg-[#00f29c] border-[#00f29c]' : 'border-zinc-700 hover:border-zinc-500'
          }`}>
            {relocation && <Icons.CheckIcon className="w-4 h-4 text-black" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Open to relocation</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Tell recruiters you&apos;re willing to move for the right role.</p>
          </div>
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
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  );
};