import React from 'react';

export const DeleteAccountSection = () => {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 mt-8 flex items-center justify-between">
      <div className="max-w-md">
        <h2 className="text-lg font-bold text-red-500 mb-1">Delete Account</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Once you delete your account, there is no going back. All your resumes, data, and matches will be permanently removed.
        </p>
      </div>
      <button className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-sm font-bold transition-all">
        Delete permanently
      </button>
    </div>
  );
};
