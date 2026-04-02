"use client";

import Link from "next/link";

export default function EmailError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <div className="bg-card-bg rounded-xl border border-border/60 p-8 shadow-sm">
        <h1 className="text-xl font-bold mb-2">Failed to load email</h1>
        <p className="text-muted text-sm mb-4">
          Something went wrong loading this email. It may still be processing.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Try again
          </button>
          <Link
            href="/emails"
            className="border border-border px-4 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors"
          >
            Back to Emails
          </Link>
        </div>
      </div>
    </div>
  );
}
