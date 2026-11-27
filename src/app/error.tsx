'use client';

import { useEffect } from 'react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Application route error:', error); }, [error]);
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-black px-5 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold">This page couldn’t load</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">Your data has not been intentionally changed. Retry the page or return to your workspace.</p>
        <div className="mt-6 flex justify-center gap-3"><button type="button" onClick={reset} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black">Try again</button><a href="/dashboard" className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300">Dashboard</a></div>
      </section>
    </main>
  );
}
