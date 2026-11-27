'use client';

import React from 'react';
import { useInterviewCallStore } from '@/store/interviewCallStore';
import { useCameraDefaultPreference, useInterviewMediaConsent, useLowBandwidth } from '@/lib/network-preferences';
import { clearLocalUserData } from '@/lib/local-user-data';

export function PrivacyControls() {
  const setCameraEnabled = useInterviewCallStore((state) => state.setCameraEnabled);
  const captionsEnabled = useInterviewCallStore((state) => state.captionsEnabled);
  const setCaptionsEnabled = useInterviewCallStore((state) => state.setCaptionsEnabled);
  const { lowBandwidth, setLowBandwidth } = useLowBandwidth();
  const { consented: mediaConsent, setConsented: setMediaConsent } = useInterviewMediaConsent();
  const { cameraDefaultEnabled, setCameraDefaultEnabled } = useCameraDefaultPreference();

  const clearLocalData = () => {
    if (!window.confirm('Delete locally stored interview reports, application tracker data, notifications, and preferences from this browser? This will not delete server-side account data.')) return;
    clearLocalUserData();
    window.location.reload();
  };

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8" aria-labelledby="privacy-controls-title">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Privacy & accessibility</p><h2 id="privacy-controls-title" className="mt-1 text-lg font-bold text-white">Data and session controls</h2><p className="mt-1 text-sm text-zinc-500">Control optional interview media and clean up data held in this browser.</p></div>
      <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4"><span><span className="block text-sm font-semibold text-white">Allow microphone audio processing in interview sessions</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">When enabled, your answers are captured in short segments and sent to the interview service for transcription and response. The microphone is never started from settings.</span></span><input type="checkbox" checked={mediaConsent} onChange={(event) => setMediaConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#00f29c]" aria-label="Allow microphone audio processing in interview sessions" /></label>
      <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4"><span><span className="block text-sm font-semibold text-white">Camera preview enabled by default</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">Camera video is used for your preview and optional on-device posture/eye-contact feedback. Turn this off for audio-only sessions.</span></span><input type="checkbox" checked={cameraDefaultEnabled} onChange={(event) => { setCameraDefaultEnabled(event.target.checked); setCameraEnabled(event.target.checked); }} className="mt-1 h-4 w-4 accent-[#00f29c]" aria-label="Camera preview enabled by default" /></label>
      <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4"><span><span className="block text-sm font-semibold text-white">Low-bandwidth mode</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">Defaults to camera off in the interview lobby and reduces optional heavy media.</span></span><input type="checkbox" checked={lowBandwidth} onChange={(event) => setLowBandwidth(event.target.checked)} className="mt-1 h-4 w-4 accent-[#00f29c]" aria-label="Low-bandwidth mode" /></label>
      <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4"><span><span className="block text-sm font-semibold text-white">Captions on by default</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">Show live captions during interviews. You can also change this inside a session.</span></span><input type="checkbox" checked={captionsEnabled} onChange={(event) => setCaptionsEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-[#00f29c]" aria-label="Captions on by default" /></label>
      <div className="flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-white">Delete local data</p><p className="mt-1 text-xs text-zinc-500">Removes this browser’s reports, saved tracker, and preferences. For server-side data, use Delete Account below.</p></div><button type="button" onClick={clearLocalData} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20">Delete local data</button></div>
    </section>
  );
}
