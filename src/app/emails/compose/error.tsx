"use client";

export default function ComposeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <div className="bg-card-bg rounded-xl border border-danger/30 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-danger mb-2">Email Error</h2>
        <p className="text-sm text-muted mb-1">Something went wrong:</p>
        <pre className="text-sm bg-stone-50 rounded-lg p-3 mb-4 overflow-x-auto text-danger/80 whitespace-pre-wrap">
          {error.message}
        </pre>
        {error.digest && (
          <p className="text-xs text-muted mb-4">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
