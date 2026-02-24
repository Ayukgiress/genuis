export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold">Total Resumes</h2>
          <p className="text-4xl font-bold mt-2">0</p>
        </div>
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold">Analysis Score</h2>
          <p className="text-4xl font-bold mt-2">--</p>
        </div>
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold">Applications</h2>
          <p className="text-4xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
