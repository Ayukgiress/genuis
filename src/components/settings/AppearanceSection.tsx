'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from '@radix-ui/react-icons';

type Theme = 'dark' | 'light' | 'system';
type FontSize = 'small' | 'medium' | 'large';
type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'red';

export const AppearanceSection = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [accentColor, setAccentColor] = useState<AccentColor>('green');
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedFontSize = localStorage.getItem('fontSize') as FontSize | null;
    const savedAccentColor = localStorage.getItem('accentColor') as AccentColor | null;
    const savedCompactMode = localStorage.getItem('compactMode') === 'true';
    const savedAnimations = localStorage.getItem('animationsEnabled') !== 'false';

    if (savedTheme) setTheme(savedTheme);
    if (savedFontSize) setFontSize(savedFontSize);
    if (savedAccentColor) setAccentColor(savedAccentColor);
    setCompactMode(savedCompactMode);
    setAnimationsEnabled(savedAnimations);

    // Apply theme to document
    applyTheme(savedTheme || 'dark');
    applyFontSize(savedFontSize || 'medium');
    applyAccentColor(savedAccentColor || 'green');
    applyCompactMode(savedCompactMode);
    applyAnimations(savedAnimations);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
      root.classList.toggle('light', newTheme === 'light');
    }
  };

  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement;
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    switch (size) {
      case 'small':
        root.classList.add('text-sm');
        break;
      case 'medium':
        root.classList.add('text-base');
        break;
      case 'large':
        root.classList.add('text-lg');
        break;
    }
  };

  const applyAccentColor = (color: AccentColor) => {
    const root = document.documentElement;
    root.classList.remove(
      'accent-green',
      'accent-blue',
      'accent-purple',
      'accent-orange',
      'accent-red'
    );
    root.classList.add(`accent-${color}`);
  };

  const applyCompactMode = (enabled: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('compact-mode', enabled);
  };

  const applyAnimations = (enabled: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', !enabled);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSuccess(null);

      localStorage.setItem('theme', theme);
      localStorage.setItem('fontSize', fontSize);
      localStorage.setItem('accentColor', accentColor);
      localStorage.setItem('compactMode', compactMode.toString());
      localStorage.setItem('animationsEnabled', animationsEnabled.toString());

      applyTheme(theme);
      applyFontSize(fontSize);
      applyAccentColor(accentColor);
      applyCompactMode(compactMode);
      applyAnimations(animationsEnabled);

      setSuccess('Appearance settings saved!');
    } catch (err) {
      console.error('Failed to save appearance settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    applyFontSize(size);
  };

  const handleAccentChange = (color: AccentColor) => {
    setAccentColor(color);
    applyAccentColor(color);
  };

  const themes: { value: Theme; label: string; description: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Dark', description: 'Always use dark mode', icon: <Icons.MoonIcon className="w-5 h-5" /> },
    { value: 'light', label: 'Light', description: 'Always use light mode', icon: <Icons.SunIcon className="w-5 h-5" /> },
    { value: 'system', label: 'System', description: 'Match your system setting', icon: <Icons.DesktopIcon className="w-5 h-5" /> },
  ];

  const fontSizes: { value: FontSize; label: string; preview: string }[] = [
    { value: 'small', label: 'Small', preview: 'text-sm' },
    { value: 'medium', label: 'Medium', preview: 'text-base' },
    { value: 'large', label: 'Large', preview: 'text-lg' },
  ];

  const accentColors: { value: AccentColor; label: string; color: string }[] = [
    { value: 'green', label: 'Emerald', color: '#00f29c' },
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'purple', label: 'Purple', color: '#a855f7' },
    { value: 'orange', label: 'Amber', color: '#f59e0b' },
    { value: 'red', label: 'Red', color: '#ef4444' },
  ];

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Appearance</h2>
        <p className="text-sm text-zinc-500">Customize how the app looks and feels.</p>
      </div>

      {success && (
        <div className="mx-8 mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
          {success}
        </div>
      )}

      <div className="p-8 space-y-8">
        {/* Theme */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Theme</h3>
              <p className="text-xs text-zinc-500">Choose your preferred color scheme.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === t.value
                    ? 'border-primary bg-primary/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  {t.icon}
                </div>
                <span className="text-sm font-semibold text-white">{t.label}</span>
                <span className="text-xs text-zinc-500 text-center">{t.description}</span>
                {theme === t.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Icons.CheckIcon className="w-3 h-3 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-4 pt-6 border-t border-zinc-800/70">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Font Size</h3>
              <p className="text-xs text-zinc-500">Adjust the base text size across the app.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {fontSizes.map((fs) => (
              <button
                key={fs.value}
                onClick={() => handleFontSizeChange(fs.value)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  fontSize === fs.value
                    ? 'border-primary bg-primary/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className={`text-center ${fs.preview}`}>
                  <p className="font-semibold text-white">{fs.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">Preview text</p>
                </div>
                {fontSize === fs.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Icons.CheckIcon className="w-3 h-3 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-4 pt-6 border-t border-zinc-800/70">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Accent Color</h3>
              <p className="text-xs text-zinc-500">Choose the highlight color used throughout the app.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {accentColors.map((ac) => (
              <button
                key={ac.value}
                onClick={() => handleAccentChange(ac.value)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  accentColor === ac.value
                    ? 'border-primary bg-primary/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg border border-zinc-800"
                  style={{ backgroundColor: ac.color }}
                />
                <span className="text-sm font-semibold text-white">{ac.label}</span>
                {accentColor === ac.value && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Icons.CheckIcon className="w-3 h-3 text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Options */}
        <div className="space-y-4 pt-6 border-t border-zinc-800/70">
          <h3 className="text-sm font-bold text-white mb-0.5">Layout & Motion</h3>

          <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">Compact Mode</span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-500">Reduce spacing for a denser interface.</span>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => {
                setCompactMode(e.target.checked);
                applyCompactMode(e.target.checked);
              }}
              className="mt-1 h-4 w-4 accent-[#00f29c] shrink-0"
            />
          </label>

          <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-black/30 p-4 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">Animations</span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-500">Enable transitions and motion effects.</span>
            </div>
            <input
              type="checkbox"
              checked={animationsEnabled}
              onChange={(e) => {
                setAnimationsEnabled(e.target.checked);
                applyAnimations(e.target.checked);
              }}
              className="mt-1 h-4 w-4 accent-[#00f29c] shrink-0"
            />
          </label>
        </div>

        {/* Preview */}
        <div className="pt-6 border-t border-zinc-800/70">
          <h3 className="text-sm font-bold text-white mb-4">Preview</h3>
          <div className="rounded-xl border border-zinc-800 bg-black/30 p-6 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Primary Button</p>
              <button className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#00f29c] text-black font-bold text-sm rounded-lg shadow-lg shadow-[#00f29c]/20">
                <Icons.PlusIcon className="w-4 h-4" />
                Create New
              </button>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Secondary Button</p>
              <button className="mt-2 inline-flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-300 font-bold text-sm rounded-lg hover:bg-zinc-800 transition-all">
                <Icons.GearIcon className="w-4 h-4" />
                Settings
              </button>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Card Example</p>
              <div className="mt-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <p className="font-bold text-white">Card Title</p>
                <p className="mt-1 text-sm text-zinc-500">This is how cards and content will appear with your current settings.</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Form Input</p>
              <input
                type="text"
                className="mt-2 w-full max-w-xs bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-all"
                placeholder="Enter text..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 pt-0 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Appearance'
          )}
        </button>
      </div>
    </div>
  );
};