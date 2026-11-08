'use client';

const USER_DATA_KEYS = [
  'application-storage',
  'genuis:interview-media-consent',
  'genuis:camera-default-enabled',
  'genuis:low-bandwidth',
  'genuis:weekly-action-goal',
  'genuis:in-app-notifications',
  'interview-prep-jobs',
];

export function clearLocalUserData() {
  if (typeof window === 'undefined') return;
  for (const key of Object.keys(window.localStorage)) {
    if (USER_DATA_KEYS.includes(key) || key.startsWith('genuis:interview-report:')) {
      window.localStorage.removeItem(key);
    }
  }
  window.dispatchEvent(new Event('genuis:privacy-settings-updated'));
}
