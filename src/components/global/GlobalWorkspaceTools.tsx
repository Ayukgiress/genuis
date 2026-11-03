'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { interviewApi, jobApi } from '@/lib/api';
import {
  IN_APP_NOTIFICATIONS_EVENT,
  IN_APP_NOTIFICATIONS_KEY,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
  type InAppNotification,
} from '@/lib/in-app-notifications';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: { label: string; href: string };
};
type Panel = 'copilot' | 'notifications' | null;

const pageLabels: Record<string, string> = {
  '/dashboard': 'Today dashboard',
  '/resumes': 'Resume workspace',
  '/analysis': 'Resume analysis',
  '/jobs': 'Job search',
  '/interviews': 'Interview practice',
  '/letters': 'Career letters',
  '/kanban': 'Application tracker',
  '/settings': 'Account settings',
};

const subscribeToNotifications = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener(IN_APP_NOTIFICATIONS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(IN_APP_NOTIFICATIONS_EVENT, callback);
  };
};
const getNotificationsSnapshot = () => window.localStorage.getItem(IN_APP_NOTIFICATIONS_KEY) ?? '[]';
const getNotificationsServerSnapshot = () => '[]';

function makeAssistantReply(prompt: string, pathname: string, jobId: string, jobTitle: string) {
  const query = new URLSearchParams();
  if (jobId) query.set('jobId', jobId);
  const jobPhrase = jobTitle ? ` for ${jobTitle}` : ' for your next target role';
  const normalized = prompt.toLowerCase();
  if (/resume|cv|ats|bullet|experience/.test(normalized)) {
    return {
      text: `I can help you move your resume forward${jobTitle ? ` for ${jobTitle}` : ''}. Open your resume workspace to review the latest analysis or start a fresh check.`,
      action: { label: 'Open resume workspace', href: '/resumes?fix=1' },
    };
  }
  if (/follow.?up|thank.?you|email|letter/.test(normalized)) {
    query.set('type', 'follow_up_letter');
    return {
      text: `Let’s draft a concise follow-up${jobTitle ? ` to ${jobTitle}` : ''}. The letter form will open with the follow-up type selected${jobTitle ? ' and this role in context' : ''}.`,
      action: { label: 'Draft a follow-up', href: `/letters?${query.toString()}` },
    };
  }
  if (/interview|practice|mock|question/.test(normalized)) {
    query.set('action', 'new');
    query.set('type', 'behavioral');
    if (jobTitle) query.set('focus', `${jobTitle} interview practice`);
    return {
      text: `Ready to practice${jobPhrase}. I’ll take you to a new mock interview; you can choose the role and start when ready.`,
      action: { label: 'Start mock interview', href: `/interviews?${query.toString()}` },
    };
  }
  if (/today|plan|next|priority|goal/.test(normalized)) {
    return {
      text: `You’re on ${pageLabels[pathname] ?? 'your career workspace'}. A practical next step is to finish one high-value task before switching contexts: practice a target interview, tighten your resume, or send a thoughtful follow-up.`,
      action: { label: 'See today’s actions', href: '/dashboard' },
    };
  }
  return {
    text: `I’m following ${pageLabels[pathname] ?? 'this page'}${jobTitle ? ` and the ${jobTitle} role` : ''}. I can help you take the next step with your resume, interview practice, or a follow-up draft. Which would you like to work on?`,
  };
}

export function GlobalWorkspaceTools() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Hi! I’m your career copilot. I can help you choose a next step and open the right workspace.' },
  ]);
  const notificationSnapshot = useSyncExternalStore(subscribeToNotifications, getNotificationsSnapshot, getNotificationsServerSnapshot);
  const notifications = useMemo(() => {
    try {
      return JSON.parse(notificationSnapshot) as InAppNotification[];
    } catch {
      return [];
    }
  }, [notificationSnapshot]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const currentPage = pathname.startsWith('/interviews/')
    ? 'Interview report'
    : pathname.startsWith('/resumes/edit/')
      ? 'Resume editor'
      : pageLabels[pathname] ?? (pathname === '/' ? 'Home' : pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ?? 'Workspace');

  useEffect(() => {
    if (!isAuthenticated || panel !== 'copilot') return;
    let cancelled = false;
    const loadCurrentJob = async () => {
      const params = new URLSearchParams(window.location.search);
      let requestedJobId = params.get('jobId') ?? '';
      const interviewId = params.get('id') ?? pathname.match(/^\/interviews\/(\d+)/)?.[1];
      if (!requestedJobId && interviewId && /^\d+$/.test(interviewId)) {
        try {
          requestedJobId = (await interviewApi.get(Number(interviewId))).job_id;
        } catch {
          requestedJobId = '';
        }
      }
      if (!requestedJobId) {
        setJobId('');
        setJobTitle('');
        return;
      }
      try {
        const job = await jobApi.getById(requestedJobId);
        if (!cancelled) {
          setJobId(requestedJobId);
          setJobTitle(job.title);
        }
      } catch {
        if (!cancelled) {
          setJobId(requestedJobId);
          setJobTitle('');
        }
      }
    };
    void loadCurrentJob();
    return () => { cancelled = true; };
  }, [isAuthenticated, panel, pathname]);

  useEffect(() => {
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panel]);

  const sendMessage = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt) return;
    const userMessage: AssistantMessage = { id: `${Date.now()}-user`, role: 'user', text: prompt };
    const response = makeAssistantReply(prompt, pathname, jobId, jobTitle);
    setMessages((current) => [...current, userMessage, { id: `${Date.now()}-assistant`, role: 'assistant', ...response }]);
    setDraft('');
  }, [draft, jobId, jobTitle, pathname]);

  if (!isAuthenticated) return null;

  const navigateFromNotification = (notification: InAppNotification) => {
    markInAppNotificationRead(notification.id);
    setPanel(null);
    if (notification.href) router.push(notification.href);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-60 flex items-center gap-2">
        <button type="button" onClick={() => setPanel(panel === 'notifications' ? null : 'notifications')} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} className="relative grid h-12 w-12 place-items-center rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-300 shadow-xl transition hover:border-zinc-500 hover:text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-black">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <button type="button" onClick={() => setPanel(panel === 'copilot' ? null : 'copilot')} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-black shadow-[0_8px_30px_rgba(0,242,156,0.2)] transition hover:brightness-95" aria-expanded={panel === 'copilot'}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12"/><circle cx="12" cy="12" r="5"/></svg>
          Copilot
        </button>
      </div>

      {panel && <div className="fixed inset-0 z-70">
        <button type="button" aria-label="Close panel" onClick={() => setPanel(null)} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <aside role="dialog" aria-modal="true" aria-labelledby="workspace-panel-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-zinc-800 bg-[#090b0a] shadow-2xl">
          {panel === 'copilot' ? <>
            <header className="border-b border-zinc-800 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Career copilot</p><h2 id="workspace-panel-title" className="mt-1 text-lg font-bold text-white">Let’s make your next move</h2></div>
                <button onClick={() => setPanel(null)} aria-label="Close copilot" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white">×</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">Page · {currentPage}</span>{jobTitle && <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] text-primary">Role · {jobTitle}</span>}</div>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
              {messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'ml-auto bg-primary text-black' : 'border border-zinc-800 bg-zinc-900 text-zinc-200'}`}><p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>{message.action && <button type="button" onClick={() => { router.push(message.action!.href); setPanel(null); }} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-black">{message.action.label} →</button>}</div>)}
              <div className="flex flex-wrap gap-2 pt-2"><QuickPrompt onClick={setDraft} value="Help me improve my resume"/><QuickPrompt onClick={setDraft} value="Start interview practice"/><QuickPrompt onClick={setDraft} value="Draft a follow-up"/></div>
            </div>
            <form onSubmit={sendMessage} className="border-t border-zinc-800 p-4">
              <label htmlFor="copilot-message" className="sr-only">Message your career copilot</label>
              <div className="flex gap-2"><input id="copilot-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about your next career step…" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primary/50"/><button type="submit" disabled={!draft.trim()} className="rounded-xl bg-primary px-4 text-sm font-bold text-black disabled:opacity-40">Send</button></div>
              <p className="mt-2 text-[10px] text-zinc-600">Context-aware guided actions · chat replies are currently generated in this browser.</p>
            </form>
          </> : <>
            <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">In-app notifications</p><h2 id="workspace-panel-title" className="mt-1 text-lg font-bold text-white">Your updates</h2></div><div className="flex items-center gap-3"><button onClick={markAllInAppNotificationsRead} className="text-[11px] font-semibold text-zinc-400 hover:text-white">Mark all read</button><button onClick={() => setPanel(null)} aria-label="Close notifications" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white">×</button></div></header>
            <div className="flex-1 overflow-y-auto p-4">
              {notifications.length ? <div className="space-y-2">{notifications.map((notification) => <button key={notification.id} type="button" onClick={() => navigateFromNotification(notification)} className={`w-full rounded-2xl border p-4 text-left transition hover:border-zinc-600 ${notification.read ? 'border-zinc-800 bg-zinc-950/60' : 'border-primary/20 bg-primary/5'}`}><div className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-zinc-700' : 'bg-primary'}`}/><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">{notification.title}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-400">{notification.body}</span><time className="mt-2 block text-[10px] text-zinc-600">{new Date(notification.createdAt).toLocaleString()}</time></span></div></button>)}</div> : <div className="flex h-full flex-col items-center justify-center px-8 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></div><p className="mt-4 text-sm font-semibold text-white">You’re all caught up</p><p className="mt-1 text-xs text-zinc-500">Interview reports and important workspace updates will appear here.</p></div>}
            </div>
            <footer className="border-t border-zinc-800 px-5 py-3 text-center text-[10px] text-zinc-600">In-app delivery is enabled. Email notifications can be added later.</footer>
          </>}
        </aside>
      </div>}
    </>
  );
}

function QuickPrompt({ value, onClick }: { value: string; onClick: (value: string) => void }) {
  return <button type="button" onClick={() => onClick(value)} className="rounded-full border border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-400 transition hover:border-primary/30 hover:text-primary">{value}</button>;
}
