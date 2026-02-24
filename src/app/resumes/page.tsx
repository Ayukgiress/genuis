export default function ResumesPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Resumes</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Upload Resume
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-card rounded-lg border">
          <h3 className="font-semibold">No resumes yet</h3>
          <p className="text-muted-foreground mt-2">
            Upload your first resume to get started
          </p>
        </div>
      </div>
    </div>
  );
}
