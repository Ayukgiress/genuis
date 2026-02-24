export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-2xl p-8 text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to Genuis</h1>
        <p className="text-lg text-gray-600">
          Your AI-powered career companion. Analyze resumes, track job applications, and land your dream job.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <a
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="rounded-md border border-gray-300 px-6 py-3 hover:bg-gray-50"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
