'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function PlansPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSelectPlan = (plan: 'free' | 'pro') => {
    if (plan === 'free') {
      router.push('/dashboard');
    } else {
      // Handle pro plan selection - redirect to payment
      router.push('/payment?plan=pro');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-black"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.871 4.285a.75.75 0 0 0-1.142 0l-4.7 5.485c-.566.66-.188 1.73.682 1.73h2.039v5.25a.75.75 0 0 0 1.5 0v-5.25h2.039c.87 0 1.248-1.07.682-1.73l-4.7-5.485zM4 19.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">Genius</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Choose Your <span className="text-primary">Plan</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Select the perfect plan to accelerate your career. Start free and upgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Free Plan</h3>
              <div className="text-4xl font-bold mb-4">$0<span className="text-lg font-normal text-zinc-400">/month</span></div>
              <p className="text-zinc-500">Perfect for getting started</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Basic resume analysis</span>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Job search functionality</span>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Limited AI optimizations</span>
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan('free')}
              className="w-full py-4 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-zinc-900/50 border border-primary/50 rounded-3xl p-8 hover:border-primary transition-all relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-black px-4 py-1 rounded-full text-sm font-bold">Most Popular</span>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
              <div className="text-4xl font-bold mb-4">$19<span className="text-lg font-normal text-zinc-400">/month</span></div>
              <p className="text-zinc-500">Unlock your full potential</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Unlimited AI Optimization</span>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Priority Job Matching</span>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Career Coaching Access</span>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Custom Cover Letters</span>
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Interview Simulator</span>
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan('pro')}
              className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,242,156,0.2)]"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-zinc-500 text-sm">
            Need help choosing? <Link href="/dashboard" className="text-primary hover:underline">Skip for now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}