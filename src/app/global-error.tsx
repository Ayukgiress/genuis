'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Root application error:', error); }, [error]);
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <main className="flex min-h-screen items-center justify-center px-5">
          <section className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <h1 className="text-2xl font-bold">Genuis hit an unexpected error</h1>
            <p className="mt-2 text-sm text-zinc-400">Retry to restore the workspace. If you’re offline, check your connection and try again.</p>
            <button type="button" onClick={reset} className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black">Reload workspace</button>
          </section>
        </main>
      </body>
    </html>
  );
}
