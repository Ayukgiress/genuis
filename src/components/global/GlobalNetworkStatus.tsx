'use client';

import React, { useEffect, useState } from 'react';
import { useLowBandwidth } from '@/lib/network-preferences';

export function GlobalNetworkStatus() {
  const [online, setOnline] = useState(true);
  const { lowBandwidth, setLowBandwidth } = useLowBandwidth();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (online && !lowBandwidth) return null;

  return (
    <div className={`fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs shadow-lg sm:px-6 ${online ? 'bg-amber-300 text-black' : 'bg-red-700 text-white'}`} role="status" aria-live="polite">
      <p className="font-semibold">{online ? 'Low-bandwidth mode is on · optional video and heavy media are reduced.' : 'You’re offline · saved local data remains available; changes may not sync.'}</p>
      {online && <button type="button" onClick={() => setLowBandwidth(false)} className="rounded-md border border-black/20 px-2 py-1 font-bold hover:bg-black/10">Turn off</button>}
    </div>
  );
}
