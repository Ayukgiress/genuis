import React from 'react';
import * as Icons from '@radix-ui/react-icons';

const Tag = ({ label, active = false }: { label: string, active?: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
    active 
      ? 'bg-[#00f29c]/10 border-[#00f29c]/30 text-[#00f29c]' 
      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
  }`}>
    {label}
    <Icons.Cross2Icon className="w-3 h-3 cursor-pointer hover:text-white transition-colors" />
  </div>
);

export const CareerSection = () => {
  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden mt-8">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Career Preferences</h2>
        <p className="text-sm text-zinc-500">Tailor your job matches and recommendations.</p>
      </div>

      <div className="p-8 space-y-8">
        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Desired Roles</label>
          <div className="flex flex-wrap gap-2">
            <Tag label="Product Designer" active />
            <Tag label="UX Architect" active />
            <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-all">
              <Icons.PlusIcon className="w-3 h-3" />
              Add Role
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Minimum Annual Salary</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <input
                type="text"
                defaultValue="120,000"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Work Mode</label>
            <div className="relative">
              <select className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all cursor-pointer">
                <option>Fully Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
              <Icons.ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-1 w-5 h-5 rounded-md bg-[#00f29c] flex items-center justify-center cursor-pointer">
            <Icons.CheckIcon className="w-4 h-4 text-black" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Open to relocation</h4>
            <p className="text-xs text-zinc-500 mt-0.5">Tell recruiters you&apos;re willing to move for the right role.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
