"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="currentColor">
          <path d="M12.871 4.285a.75.75 0 0 0-1.142 0l-4.7 5.485c-.566.66-.188 1.73.682 1.73h2.039v5.25a.75.75 0 0 0 1.5 0v-5.25h2.039c.87 0 1.248-1.07.682-1.73l-4.7-5.485zM4 19.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75z" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight">Genius</span>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isLoading, error, login, clearError, loginWithGoogle, handleGoogleCallback, getRedirectPath } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      handleGoogleCallback(code);
    }
  }, [searchParams, handleGoogleCallback]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = getRedirectPath();
      router.push(redirectPath);
    }
  }, [isAuthenticated, user, router, getRedirectPath]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!email || !password) {
      setFormError("Please fill in all fields");
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by the store
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 grid grid-cols-1 lg:grid-cols-2 items-center relative">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center p-16 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10" />

        <div className="space-y-10 max-w-lg w-full">
          <Logo />

          <div className="space-y-5">
            <h1 className="text-6xl font-bold leading-[1.1] tracking-tight">
              Elevate Your <br />
              <span className="text-primary">Career</span> Path.
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              A high-end AI platform designed for the modern job seeker.
              Leverage intelligence to land your dream role.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: "AI Resume Intelligence", filled: true, icon: <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /> },
              { label: "Elite Job Matching", filled: false, icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></> },
              { label: "Interview Coaching", filled: false, icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
            ].map(({ label, filled, icon }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-300">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="2">
                  {icon}
                </svg>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center min-h-screen p-6 lg:p-12 w-full">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Logo />
        </div>

        <div className="w-full max-w-[440px] space-y-7 bg-[#0D0D0D] border border-zinc-800/50 p-10 rounded-3xl shadow-2xl">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-zinc-500 text-sm">Sign in to continue your career journey.</p>
          </div>

          {/* Social Login */}
          <button 
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800 bg-transparent hover:bg-zinc-900 transition-all group disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800/50" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
              <span className="bg-[#0D0D0D] px-4 text-zinc-600 font-semibold">Secure Access</span>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {(error || formError) && (
              <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm flex items-start gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {formError || error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Password
                </label>
                <a href="/forgot-password" className="text-[10px] font-bold text-primary hover:opacity-80 transition-opacity">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-11 rounded-xl bg-zinc-900/30 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary/20 accent-primary"
              />
              <label htmlFor="remember" className="text-sm text-zinc-400 select-none cursor-pointer">
                Keep me logged in
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-primary text-black font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,242,156,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            New to the elite platform?{" "}
            <a href="/register" className="text-primary font-bold hover:underline underline-offset-4">
              Create Account
            </a>
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center lg:justify-start lg:left-6 gap-6 text-[10px] tracking-widest text-zinc-600 uppercase">
        <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}