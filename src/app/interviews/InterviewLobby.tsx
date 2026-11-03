'use client';

import React, { useEffect, useState } from 'react';
import { useInterviewLobbyDevices } from '@/hooks/useInterviewLobbyDevices';
import { useInterviewCallStore } from '@/store/interviewCallStore';
import { useCameraDefaultPreference, useInterviewMediaConsent, useLowBandwidth } from '@/lib/network-preferences';

export function InterviewLobby({ jobTitle, onStart, onStartTextOnly }: { jobTitle?: string; onStart: () => void; onStartTextOnly: () => void }) {
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [offer, setOffer] = useState('');
  const [target, setTarget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const { consented: recordingConsent, setConsented: setRecordingConsent } = useInterviewMediaConsent();
  const { cameraDefaultEnabled, setCameraDefaultEnabled } = useCameraDefaultPreference();
  const { lowBandwidth } = useLowBandwidth();
  const {
    interviewType, difficulty, durationMinutes, language, cameraEnabled,
    audioDeviceId, videoDeviceId, setInterviewType, setDifficulty,
    setDurationMinutes, setLanguage, setCameraEnabled, setAudioDeviceId,
    setVideoDeviceId,
  } = useInterviewCallStore();
  const {
    videoRef,
    microphones,
    cameras,
    level,
    micError,
    cameraError,
    isLoading,
    hasMicrophone,
    hasCamera,
    startPreview,
    stopPreview,
  } = useInterviewLobbyDevices(audioDeviceId, videoDeviceId, lowBandwidth ? false : cameraDefaultEnabled, recordingConsent);
  const canJoin = hasMicrophone && !isLoading;

  useEffect(() => {
    if (lowBandwidth && cameraEnabled) setCameraEnabled(false);
  }, [lowBandwidth, cameraEnabled, setCameraEnabled]);

  const handleJoin = () => {
    if (!canJoin || !recordingConsent) return;
    setCameraEnabled(lowBandwidth ? false : cameraDefaultEnabled);
    stopPreview();
    onStart();
  };
  const formatMoney = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  const offerAmount = Number(offer);
  const targetAmount = Number(target);
  const negotiationScript = Number.isFinite(offerAmount) && Number.isFinite(targetAmount) && offerAmount > 0 && targetAmount > 0
    ? `Thank you for the offer. I’m excited about ${jobTitle ? `the ${jobTitle} role` : 'the opportunity'} and the impact I could make. Based on the scope of the role and my experience, would you be open to a base salary of ${formatMoney(targetAmount)}? I’m happy to discuss the full compensation package and find a number that works for both sides.`
    : '';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Pre-call check</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Set up your interview</h1>
          <p className="mt-2 text-sm text-zinc-400">{jobTitle ? `Practice for ${jobTitle}.` : 'Test your devices and choose how you want to practice.'} Camera is optional.</p>
        </div>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">Your devices stay on this device</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
          <div className="relative aspect-video min-h-65 bg-[radial-gradient(ellipse_at_50%_35%,rgba(0,242,156,0.12),transparent_60%),linear-gradient(145deg,#101313,#050606)]">
            {hasCamera && cameraDefaultEnabled && !lowBandwidth ? (
              <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" aria-label="Camera preview" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-full border border-primary/20 bg-primary/10 text-2xl font-semibold text-primary">
                  {(jobTitle || 'AI')[0].toUpperCase()}
                </div>
                <p className="text-sm font-medium text-zinc-200">Camera off · audio-only setup</p>
                {cameraError && <p className="max-w-sm px-5 text-xs leading-relaxed text-amber-300">{cameraError}</p>}
              </div>
            )}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-200 backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${isLoading ? 'animate-pulse bg-amber-400' : canJoin ? 'bg-primary' : 'bg-red-400'}`} />
              {isLoading ? 'Checking devices' : canJoin ? 'Preview ready' : 'Microphone required'}
            </div>
            <button type="button" onClick={() => {
              setCameraDefaultEnabled(!cameraDefaultEnabled);
            }} disabled={lowBandwidth} className="absolute bottom-4 right-4 rounded-xl border border-white/10 bg-black/65 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70">
              {lowBandwidth ? 'Camera off in low-bandwidth mode' : cameraDefaultEnabled ? 'Use audio only' : 'Enable camera'}
            </button>
          </div>
          <div className="grid gap-5 border-t border-zinc-800 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Microphone level</span>
                <span className="text-zinc-500">{hasMicrophone ? 'Speak to test' : 'No input'}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${Math.max(3, level * 100)}%` }} />
              </div>
              {micError && <p role="alert" className="mt-3 text-xs leading-relaxed text-red-300">{micError}</p>}
              {!hasMicrophone && <button type="button" onClick={() => void startPreview()} className="mt-3 text-xs font-semibold text-primary hover:underline">Retry microphone permission</button>}
            </div>
            <label className="text-xs font-semibold text-zinc-300">
              Microphone
              <select value={audioDeviceId} onChange={(event) => setAudioDeviceId(event.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50">
                <option value="">Default microphone</option>
                {microphones.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Interview format</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">These settings guide the interviewer’s questions.</p>
          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-zinc-300">
              <input type="checkbox" checked={recordingConsent} onChange={(event) => setRecordingConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#00f29c]" />
              <span><strong className="text-white">I consent to microphone audio processing.</strong> My spoken answers are captured in short segments and sent to the interview service for transcription and responses. I can mute or end the session at any time. Camera video is optional and is not sent with my audio answers.</span>
            </label>
            <label className="block text-xs font-semibold text-zinc-300">Interview type
              <select value={interviewType} onChange={(event) => setInterviewType(event.target.value as typeof interviewType)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50">
                <option value="behavioral">Behavioral</option><option value="technical">Technical</option><option value="general">General screening</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-zinc-300">Difficulty
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50">
                <option value="entry">Entry level</option><option value="mid">Mid level</option><option value="senior">Senior</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-zinc-300">Duration
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value) as typeof durationMinutes)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50">
                  <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-zinc-300">Speech language
                <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50">
                  <option value="en-CM">English · Cameroon</option><option value="fr-CM">Français · Cameroun</option>
                </select>
              </label>
            </div>
            {cameraDefaultEnabled && !lowBandwidth && (
              <label className="block text-xs font-semibold text-zinc-300">Camera
                <select value={videoDeviceId} onChange={(event) => setVideoDeviceId(event.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50">
                  <option value="">Default camera</option>
                  {cameras.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
                </select>
              </label>
            )}
          </div>
          <button type="button" onClick={handleJoin} disabled={!canJoin || !recordingConsent} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">
            Join interview <span aria-hidden="true">→</span>
          </button>
          <button type="button" onClick={() => { stopPreview(); onStartTextOnly(); }} className="mt-3 w-full rounded-xl border border-zinc-800 px-4 py-3 text-xs font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white">Continue with text chat instead</button>
          <p className="mt-3 text-center text-[11px] text-zinc-600">No camera? Join with audio only. Text chat also works if microphone access is unavailable and does not require microphone consent.</p>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Offer practice</p><h2 className="mt-1 text-lg font-semibold text-white">Negotiation simulator</h2><p className="mt-1 text-sm text-zinc-500">Rehearse a respectful counteroffer before the real conversation.</p></div>
          <button type="button" onClick={() => setShowNegotiation((shown) => !shown)} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/15">{showNegotiation ? 'Close simulator' : 'Practice salary negotiation'} <span aria-hidden="true" className="ml-1">{showNegotiation ? '−' : '→'}</span></button>
        </div>
        {showNegotiation && <div className="grid gap-5 border-t border-zinc-800 p-5 sm:p-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-500">Enter the numbers you want to practice with. They stay in this screen and are not submitted.</p>
            <label className="block text-xs font-semibold text-zinc-300">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50"><option value="USD">USD · US Dollar</option><option value="XAF">XAF · Central African CFA franc</option><option value="EUR">EUR · Euro</option><option value="GBP">GBP · British Pound</option><option value="CAD">CAD · Canadian Dollar</option></select></label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-300">Offer amount<input type="number" min="0" value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="e.g. 85000" className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50" /></label>
              <label className="block text-xs font-semibold text-zinc-300">Target amount<input type="number" min="0" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="e.g. 95000" className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm font-normal text-zinc-200 outline-none focus:border-primary/50" /></label>
            </div>
            {negotiationScript && <p className="text-xs text-zinc-500">Counteroffer difference: <span className="font-semibold text-primary">{formatMoney(targetAmount - offerAmount)}</span></p>}
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/4 p-5">
            <h3 className="text-sm font-bold text-white">Your practice script</h3>
            {negotiationScript ? <><p className="mt-3 text-sm leading-7 text-zinc-300">“{negotiationScript}”</p><p className="mt-4 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-600">Practice adapting this to your achievements, market research, and total compensation priorities.</p></> : <p className="mt-3 text-sm leading-6 text-zinc-500">Enter an offer and a target amount to generate a calm, collaborative counteroffer prompt.</p>}
          </div>
        </div>}
      </section>
    </div>
  );
}
