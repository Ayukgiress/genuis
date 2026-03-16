import React from 'react';
import * as Icons from '@radix-ui/react-icons';

export const Header = () => {
  return (
    <header className="h-16 border-b border-zinc-800 bg-black flex items-center justify-between px-8 text-sm">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00f29c] rounded-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight">Genius</span>
        </div>
        
        <nav className="flex items-center gap-6 text-zinc-400 font-medium">
          <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
          <a href="/jobs" className="hover:text-white transition-colors">Jobs</a>
          <a href="/messages" className="hover:text-white transition-colors">Messages</a>
          <a href="/resources" className="hover:text-white transition-colors">Resources</a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <Icons.MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search resources..."
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg py-1.5 pl-10 pr-4 w-64 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
          />
        </div>
        
        <button className="p-2 text-zinc-400 hover:text-white bg-zinc-900/50 rounded-full border border-zinc-800 transition-colors">
          <Icons.BellIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-200 overflow-hidden">
            <img 
              src="https://avatar.iran.liara.run/public/boy?username=Alex" 
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
