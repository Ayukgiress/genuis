export default function LoginPage() {
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
            <span className="text-xl font-bold tracking-tight">Smart Career Assistant</span>
          </div>

          {/* Main Content */}
          <div className="space-y-6 max-w-lg">
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

        {/* Footer info for desktop */}
        <div className="flex gap-8 text-[10px] tracking-widest text-zinc-600 uppercase">
          <span>© 2024 OBSIDIAN SERIES</span>
          <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Protocol</a>
          <a href="#" className="hover:text-zinc-400 transition-colors">Service Terms</a>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[440px] space-y-8 bg-[#0D0D0D] border border-zinc-800/50 p-10 rounded-3xl shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Login</h2>
            <p className="text-zinc-500 text-sm">Continue with your professional profile.</p>
          </div>

          {/* Social Login */}
          <button className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-800 bg-transparent hover:bg-zinc-900 transition-all group">
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
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
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
              className="w-full py-4 rounded-full bg-primary text-black font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,242,156,0.2)]"
            >
              Sign In to Dashboard
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

      {/* Mobile Footer */}
      <div className="lg:hidden absolute bottom-6 w-full text-center space-y-2 text-[10px] tracking-widest text-zinc-600 uppercase">
        <p>© 2024 OBSIDIAN SERIES</p>
        <div className="flex justify-center gap-4">
          <a href="#">Privacy Protocol</a>
          <a href="#">Service Terms</a>
        </div>
      </div>
    </div>
  );
}
