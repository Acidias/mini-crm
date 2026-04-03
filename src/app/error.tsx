"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="bg-card-bg rounded-xl border border-danger/30 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-danger mb-2">Something went wrong</h2>
        <pre className="text-sm bg-stone-50 rounded-lg p-3 mb-4 overflow-x-auto text-danger/80 whitespace-pre-wrap break-words">
          {error.message}
        </pre>
        {error.digest && (
          <p className="text-xs text-muted mb-4">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="border border-border px-4 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
