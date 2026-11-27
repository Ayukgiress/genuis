'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from '@radix-ui/react-icons';
import { authApi, ApiError } from '@/lib/api';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  features: string[];
  color: string;
  bgColor: string;
}

export const IntegrationsSection = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Import your profile, experience, and skills to auto-fill your resume and career preferences.',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
      connected: false,
      features: ['Profile import', 'Experience sync', 'Skills extraction', 'Network insights'],
      color: '#0077b5',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Sync repositories, contributions, and tech stack to showcase your projects and coding activity.',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
      connected: false,
      features: ['Repository sync', 'Contribution graph', 'Tech stack detection', 'Project showcase'],
      color: '#24292e',
      bgColor: 'bg-zinc-500/10 border-zinc-500/20',
    },
    {
      id: 'google',
      name: 'Google Calendar',
      description: 'Sync interview schedules and deadlines to your calendar automatically.',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>,
      connected: false,
      features: ['Interview sync', 'Deadline reminders', 'Auto-scheduling', 'Time zone handling'],
      color: '#4285f4',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Receive job alerts, interview reminders, and application updates in your Slack workspace.',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 6h-12.1c-.8 0-1.5.7-1.5 1.5v8.9c0 .8.7 1.5 1.5 1.5h8.9c.8 0 1.5-.7 1.5-1.5V11c0-.8-.7-1.5-1.5-1.5h-1.8v-2.5h1.8c.8 0 1.5-.7 1.5-1.5V6zm-11.6 0c-.8 0-1.5.7-1.5 1.5v2.5H6.5c-.8 0-1.5.7-1.5 1.5v2.5c0 .8.7 1.5 1.5 1.5H8v2.5c0 .8.7 1.5 1.5 1.5h2.5c.8 0 1.5-.7 1.5-1.5v-2.5h2.5c.8 0 1.5-.7 1.5-1.5v-2.5c0-.8-.7-1.5-1.5-1.5h-2.5v-2.5h-1.8z"/></svg>,
      connected: false,
      features: ['Job alerts', 'Interview reminders', 'Status updates', 'Team notifications'],
      color: '#4a154b',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Export your applications, interview notes, and career plans to a Notion workspace.',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1.5 15.5h-13V9h13v9.5zM7.5 12h1v-1h-1v1zm2.5 0h1v-1h-1v1zm2.5 0h1v-1h-1v1zM7.5 15.5h1v-1h-1v1zm2.5 0h1v-1h-1v1zm2.5 0h1v-1h-1v1z"/></svg>,
      connected: false,
      features: ['Application tracker', 'Interview notes', 'Career planning', 'Template sync'],
      color: '#000000',
      bgColor: 'bg-zinc-500/10 border-zinc-500/20',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect with 5000+ apps to automate workflows like saving jobs to Sheets or posting to Discord.',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>,
      connected: false,
      features: ['5000+ app connections', 'Custom workflows', 'Webhook support', 'Multi-step zaps'],
      color: '#ff4a00',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
    },
  ]);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConnect = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    try {
      setConnecting(integrationId);
      setError(null);
      setSuccess(null);

      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIntegrations(prev => prev.map(i =>
        i.id === integrationId ? { ...i, connected: true } : i
      ));
      setSuccess(`${integration.name} connected successfully!`);
    } catch (err) {
      console.error(`Failed to connect ${integrationId}:`, err);
      setError(`Failed to connect ${integration.name}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    if (!window.confirm(`Disconnect ${integration.name}? You'll lose access to its features.`)) return;

    try {
      setDisconnecting(integrationId);
      setError(null);
      setSuccess(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      setIntegrations(prev => prev.map(i =>
        i.id === integrationId ? { ...i, connected: false } : i
      ));
      setSuccess(`${integration.name} disconnected`);
    } catch (err) {
      console.error(`Failed to disconnect ${integrationId}:`, err);
      setError(`Failed to disconnect ${integration.name}`);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleConfigure = (integrationId: string) => {
    // In real app, open configuration modal or navigate to config page
    const integration = integrations.find(i => i.id === integrationId);
    alert(`Configure ${integration?.name} - would open settings modal`);
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-8 pb-6 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Integrations</h2>
        <p className="text-sm text-zinc-500">Connect external services to enhance your experience.</p>
      </div>

      {error && (
        <div className="mx-8 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-8 mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">
          {success}
        </div>
      )}

      <div className="p-8 space-y-6">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={`rounded-xl border transition-all ${integration.connected ? 'border-primary/30 bg-primary/5' : 'border-zinc-800 bg-black/30 hover:border-zinc-700'}`}
          >
            <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${integration.bgColor} shrink-0`}>
                  {integration.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{integration.name}</h3>
                    {integration.connected && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-tighter">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 truncate">{integration.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:ml-4">
                {integration.connected ? (
                  <>
                    <button
                      onClick={() => handleConfigure(integration.id)}
                      disabled={connecting === integration.id || disconnecting === integration.id}
                      className="px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={connecting === integration.id || disconnecting === integration.id}
                      className="px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Icons.LinkBreak2Icon className="w-3 h-3" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    disabled={connecting === integration.id}
                    className="px-4 py-2 bg-[#00f29c] hover:bg-[#00f29c]/90 text-black rounded-xl text-sm font-bold shadow-lg shadow-[#00f29c]/10 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {connecting === integration.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Icons.Link2Icon className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 border-t border-zinc-800/50">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {integration.features.map((feature, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900/50 border border-zinc-800 text-zinc-400"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Coming Soon */}
        <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-6 text-center">
          <Icons.PlusCircledIcon className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">More integrations coming soon</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            We&apos;re working on adding support for Microsoft Outlook, Discord, Trello, Asana, and more.
            <button className="text-primary hover:underline font-bold ml-1" onClick={() => alert('Would open feedback form')}>
              Request an integration
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};