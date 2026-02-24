export default function AnalysisPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Resume Analysis</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          <p className="text-muted-foreground">
            Upload a resume to see detailed analysis
          </p>
        </div>
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Suggestions</h2>
          <p className="text-muted-foreground">
            AI-powered suggestions will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
