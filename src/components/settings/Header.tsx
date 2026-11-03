import React from 'react';
import * as Icons from '@radix-ui/react-icons';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

export const Header = () => {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  return (
    <header className="h-16 border-b border-zinc-800 bg-black flex items-center justify-between px-8 text-sm sticky top-0 z-50 backdrop-blur-md bg-black/80">
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-[#00f29c] rounded-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight">Genius</span>
        </Link>
        
        <nav className="flex items-center gap-6 text-zinc-400 font-medium">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/jobs" className="hover:text-white transition-colors">Jobs</Link>
          <Link href="/resumes" className="hover:text-white transition-colors">Resumes</Link>
          <Link href="/analysis" className="hover:text-white transition-colors">Analysis</Link>
          <Link href="/kanban" className="hover:text-white transition-colors">Kanban</Link>
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

        <div className="flex items-center gap-4">
          <Link href="/settings" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-[#00f29c]/10 border border-[#00f29c]/20 overflow-hidden group-hover:border-[#00f29c]/50 transition-colors">
              <img 
                src={`https://avatar.iran.liara.run/public/boy?username=${user?.name || 'Alex'}`} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            {user && (
              <span className="text-zinc-400 group-hover:text-white transition-colors truncate max-w-[100px]">
                {user.name || user.email.split('@')[0]}
              </span>
            )}
          </Link>
          
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <Icons.ExitIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
