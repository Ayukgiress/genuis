'use client';

import Link from 'next/link';

export function UpgradePrompt({ title = 'Upgrade to Pro', message = 'You’ve reached the limit available on your current plan.' }: { title?: string; message?: string }) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4" role="status">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{message}</p>
      <Link href="/payment?plan=pro" className="mt-3 inline-flex rounded-lg bg-primary px-3 py-2 text-xs font-bold text-black transition hover:brightness-95">View Pro plan <span className="ml-1" aria-hidden="true">→</span></Link>
    </div>
  );
}
