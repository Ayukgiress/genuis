"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const { verifyEmail, isLoading, error, isEmailVerified } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setTimeout(() => {
        setStatus("error");
        setMessage("No verification token provided. Please check your email for the verification link.");
      }, 0);
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyEmail(token);
        setStatus("success");
        setMessage(response.message);
      } catch (err) {
        setStatus("error");
        // Error is already set in the store, extract from there
        setMessage(error || "Email verification failed. The token may be invalid or expired.");
      }
    };

    verify();
  }, [token, verifyEmail, error]);

  const handleGoToLogin = () => {
    router.push("/login");
  };

  const handleGoToHome = () => {
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-black text-white selection:bg-primary/30">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10" />
        
        <div className="space-y-12">
          {/* Logo */}
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
            <span className="text-xl font-bold tracking-tight">Genius </span>
          </div>

          {/* Main Content */}
          <div className="space-y-6 w-full">
            <h1 className="text-7xl font-bold leading-[1.1] tracking-tight">
              Elevate Your <br />
              <span className="text-primary">Career</span> Path.
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              A high-end AI platform designed for the modern job seeker. 
              Leverage obsidian-grade intelligence to land your dream role.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary fill-current">
                <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
              </svg>
              AI-Powered Analysis
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary fill-current">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Smart Matching
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary fill-current">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Real-time Updates
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-zinc-500 text-sm">
          © 2024 Genius API. All rights reserved.
        </div>
      </div>

      {/* Right Side - Verification Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
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
            <span className="text-xl font-bold tracking-tight">Genius </span>
          </div>

          {/* Status Content */}
          <div className="text-center space-y-4">
            {/* Loading State */}
            {status === "loading" && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-2xl font-bold">Verifying your email...</h2>
                <p className="text-zinc-400">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {/* Success State */}
            {status === "success" && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-400">Email Verified!</h2>
                <p className="text-zinc-400">
                  {message}
                </p>
                <div className="pt-4">
                  <button
                    onClick={handleGoToLogin}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              </>
            )}

            {/* Error State */}
            {status === "error" && (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-red-400">Verification Failed</h2>
                <p className="text-zinc-400">
                  {message}
                </p>
                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleGoToLogin}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg transition-colors"
                  >
                    Go to Login
                  </button>
                  <button
                    onClick={handleGoToHome}
                    className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Help Text */}
          {status === "loading" && (
            <p className="text-center text-zinc-500 text-sm">
              Didn't receive an email? Check your spam folder or{' '}
              <a href="/resend-verification" className="text-primary hover:underline">
                request a new verification email
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
