"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isLoading, error, login, clearError, loginWithGoogle, handleGoogleCallback, getRedirectPath } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 grid grid-cols-1 lg:grid-cols-2 items-center">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center p-16 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10" />

        <div className="space-y-12 max-w-2xl">
          {/* Logo */}


          <div className="space-y-6 w-full text-center">
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
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary fill-current">
                <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
              </svg>
              AI Resume Intelligence
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-300">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              Elite Job Matching
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center min-h-screen p-6 lg:p-12 w-full">
        <div className="w-full max-w-[440px] space-y-8 bg-[#0D0D0D] border border-zinc-800/50 p-10 rounded-3xl shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Login</h2>
            <p className="text-zinc-500 text-sm">Continue with your professional profile.</p>
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
          <form className="space-y-6" onSubmit={handleSubmit}>
            {(error || formError) && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                {formError || error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Password
                </label>
                <a href="#" className="text-[10px] font-bold text-primary hover:opacity-80 transition-opacity">
                  Reset Password?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 px-1">
              <input 
                type="checkbox" 
                id="remember"
                className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary/20 accent-primary"
              />
              <label htmlFor="remember" className="text-sm text-zinc-400 select-none">
                Keep me logged in
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-primary text-black font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,242,156,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In to Dashboard"}
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

      {/* Desktop Footer */}
      <div className="hidden lg:flex absolute bottom-6 left-6 gap-8 text-[10px] tracking-widest text-zinc-600 uppercase">
        <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Protocol</a>
        <a href="#" className="hover:text-zinc-400 transition-colors">Service Terms</a>
      </div>

      {/* Mobile Footer */}
      <div className="lg:hidden absolute bottom-6 w-full text-center space-y-2 text-[10px] tracking-widest text-zinc-600 uppercase">
        <div className="flex justify-center gap-4">
          <a href="#">Privacy Protocol</a>
          <a href="#">Service Terms</a>
        </div>
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