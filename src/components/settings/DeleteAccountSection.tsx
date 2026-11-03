import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { clearLocalUserData } from '@/lib/local-user-data';

export const DeleteAccountSection = () => {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') return;
    setIsDeleting(true);
    setError(null);
    try {
      await authApi.deleteAccount();
      clearLocalUserData();
      await logout();
      router.replace('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete your account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="max-w-md">
          <h2 className="text-lg font-bold text-red-500 mb-1">Delete my account and data</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Permanently request removal of your account, resumes, and career data from the service. This browser&apos;s locally saved application data and interview reports are also cleared after the request succeeds. This action cannot be undone.
          </p>
        </div>
        {!isConfirming && (
          <button type="button" onClick={() => setIsConfirming(true)} className="self-start px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-sm font-bold transition-all">
            Delete permanently
          </button>
        )}
      </div>

      {isConfirming && (
        <div className="mt-6 border-t border-red-500/15 pt-6 space-y-4" role="group" aria-label="Confirm account deletion">
          <label htmlFor="delete-account-confirmation" className="block text-sm text-zinc-300">
            Type <span className="font-bold text-white">DELETE</span> to confirm.
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input id="delete-account-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="w-full sm:max-w-xs rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50" />
            <button type="button" onClick={handleDelete} disabled={confirmation !== 'DELETE' || isDeleting} className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed">
              {isDeleting ? 'Deleting…' : 'Confirm deletion'}
            </button>
            <button type="button" onClick={() => { setIsConfirming(false); setConfirmation(''); setError(null); }} disabled={isDeleting} className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-900 disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </section>
  );
};
