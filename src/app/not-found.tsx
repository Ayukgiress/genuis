import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-black px-5 text-white">
      <section className="text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">404 · Page not found</p><h1 className="mt-3 text-3xl font-bold">That page isn’t here</h1><p className="mt-2 text-sm text-zinc-500">The link may be out of date or the page may have moved.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black">Back to workspace</Link></section>
    </main>
  );
}
