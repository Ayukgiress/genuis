import React from 'react';
import * as Icons from '@radix-ui/react-icons';

export const ProfileSection = () => {
  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Profile Information</h2>
        <p className="text-sm text-zinc-500">How your info appears to recruiters.</p>
      </div>

      <div className="p-8 space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-orange-200 border-4 border-zinc-800 overflow-hidden">
               <img 
                src="https://avatar.iran.liara.run/public/boy?username=Alex" 
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
              defaultValue="Alex Johnson"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              defaultValue="alex.johnson@example.com"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Professional Bio</label>
          <textarea
            rows={4}
            defaultValue="Passionate Senior Product Designer with 8+ years of experience in fintech and SaaS. Dedicated to creating user-centric experiences that drive business results."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all resize-none"
          />
        </div>
      </div>

      <div className="p-8 pt-0 flex justify-end">
        <button className="px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all">
          Save Changes
        </button>
      </div>
    </div>
  );
};
