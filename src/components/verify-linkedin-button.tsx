"use client";

import { useState } from "react";
import Link from "next/link";

type InvalidResult = { id: number; name: string; linkedin: string; status: number };

export default function VerifyLinkedInButton() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<{ total: number; valid: number; invalid: InvalidResult[] } | null>(null);

  async function runVerification() {
    setIsChecking(true);
    setResults(null);
    try {
      const res = await fetch("/api/verify-linkedin", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // ignore
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={runVerification}
        disabled={isChecking}
        className="border border-border text-muted px-3 py-2.5 rounded-lg text-sm hover:bg-stone-50 hover:text-foreground transition-colors disabled:opacity-50"
      >
        {isChecking ? "Checking..." : "Verify LinkedIn"}
      </button>

      {results && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setResults(null)}>
          <div className="bg-card-bg rounded-xl border border-border/60 shadow-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">LinkedIn Verification</h3>
              <button onClick={() => setResults(null)} className="text-muted hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            <p className="text-sm mb-3">
              <span className="text-success font-medium">{results.valid}</span>
              <span className="text-muted">/{results.total} profiles valid</span>
              {results.invalid.length > 0 && (
                <span className="text-danger ml-1.5 font-medium">({results.invalid.length} broken)</span>
              )}
            </p>
            {results.invalid.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.invalid.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-t border-border/40">
                    <Link href={`/persons/${r.id}/edit`} className="text-accent hover:underline font-medium" onClick={() => setResults(null)}>
                      {r.name}
                    </Link>
                    <span className="text-muted text-xs truncate ml-3 max-w-[200px]">{r.linkedin}</span>
                  </div>
                ))}
              </div>
            )}
            {results.invalid.length === 0 && (
              <p className="text-success text-sm flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                All LinkedIn profiles are valid!
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
