'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const plan = searchParams.get('plan') || 'pro'; // Currently only supporting pro plan

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleCreateCheckoutSession = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await api.post<{ checkout_url: string }>('/payment/create-checkout-session', {});

      // Redirect to Stripe Checkout
      window.location.href = response.checkout_url;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to initiate payment. Please try again.');
      }
    } finally {
      setIsProcessing(false);
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
      <div className="max-w-md mx-auto px-6 pb-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">Upgrade to Pro</h1>
          <p className="text-zinc-400 mb-8">Unlock all premium features</p>

          <div className="bg-zinc-800/50 rounded-xl p-6 mb-8">
            <div className="text-3xl font-bold mb-2">$19<span className="text-lg font-normal text-zinc-400">/month</span></div>
            <p className="text-zinc-500 text-sm">Billed monthly, cancel anytime</p>
          </div>

          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm">Unlimited AI Optimization</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm">Priority Job Matching</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm">Career Coaching Access</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm">Custom Cover Letters</span>
            </div>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm">Interview Simulator</span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateCheckoutSession}
            disabled={isProcessing}
            className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,242,156,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              'Upgrade to Pro - $19/month'
            )}
          </button>

          <button
            onClick={() => router.push('/plans')}
            className="w-full mt-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:text-white hover:border-zinc-700 transition-all"
          >
            Back to Plans
          </button>
        </div>
      </div>
    </div>
  );
}