'use client';

import { useSyncExternalStore } from 'react';

const LOW_BANDWIDTH_KEY = 'genuis:low-bandwidth';
const CHANGE_EVENT = 'genuis:network-preferences-updated';
const PRIVACY_EVENT = 'genuis:privacy-settings-updated';
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
};
const getSnapshot = () => window.localStorage.getItem(LOW_BANDWIDTH_KEY) === 'true';
const getServerSnapshot = () => false;

export function useLowBandwidth() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setEnabled = (next: boolean) => {
    window.localStorage.setItem(LOW_BANDWIDTH_KEY, String(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return { lowBandwidth: enabled, setLowBandwidth: setEnabled };
}

const subscribeToPrivacy = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener(PRIVACY_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(PRIVACY_EVENT, callback);
  };
};

export function useInterviewMediaConsent() {
  const consented = useSyncExternalStore(
    subscribeToPrivacy,
    () => window.localStorage.getItem('genuis:interview-media-consent') === 'accepted',
    () => false,
  );
  const setConsented = (accepted: boolean) => {
    if (accepted) window.localStorage.setItem('genuis:interview-media-consent', 'accepted');
    else window.localStorage.removeItem('genuis:interview-media-consent');
    window.dispatchEvent(new Event(PRIVACY_EVENT));
  };
  return { consented, setConsented };
}

export function useCameraDefaultPreference() {
  const enabled = useSyncExternalStore(
    subscribeToPrivacy,
    () => window.localStorage.getItem('genuis:camera-default-enabled') !== 'false',
    () => true,
  );
  const setEnabled = (next: boolean) => {
    window.localStorage.setItem('genuis:camera-default-enabled', String(next));
    window.dispatchEvent(new Event(PRIVACY_EVENT));
  };
  return { cameraDefaultEnabled: enabled, setCameraDefaultEnabled: setEnabled };
}
