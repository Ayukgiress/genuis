'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Payment verification timeout, proceeding to dashboard');
      setIsVerifying(false);
      router.push('/dashboard');
    }, 10000); // 10 second timeout

    if (sessionId) {
      // Refresh user data to get updated subscription status
      fetchCurrentUser()
        .then(() => {
          clearTimeout(timeout);
          setIsVerifying(false);
          // Auto-redirect to dashboard after verification
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        })
        .catch((error) => {
          console.error('Failed to refresh user data:', error);
          clearTimeout(timeout);
          // Still proceed even if refresh fails
          setIsVerifying(false);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        });
    } else {
      // No session ID, just proceed
      clearTimeout(timeout);
      setIsVerifying(false);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isLoading, router, sessionId, fetchCurrentUser]);

  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Verifying payment...</p>
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
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-zinc-400 mb-8">Welcome to the Pro plan. Your account has been upgraded.</p>

          <div className="bg-zinc-800/50 rounded-xl p-6 mb-8">
            <div className="text-sm text-zinc-500 mb-2">Your new plan</div>
            <div className="text-xl font-bold">Pro Plan</div>
            <div className="text-zinc-400">$19/month</div>
          </div>

          <Link
            href="/dashboard"
            className="w-full py-4 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,242,156,0.2)] inline-block text-center"
          >
            Continue to Dashboard
          </Link>

          <div className="mt-6 text-center">
            <p className="text-zinc-500 text-sm">
              Questions? <a href="mailto:support@genius.ai" className="text-primary hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}