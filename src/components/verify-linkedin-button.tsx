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
    <div>
      <button
        type="button"
        onClick={runVerification}
        disabled={isChecking}
        className="border border-[#0A66C2] text-[#0A66C2] px-3 py-2 rounded-lg text-xs hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {isChecking ? "Checking..." : "Verify LinkedIn URLs"}
      </button>

      {results && (
        <div className="mt-3 bg-card-bg rounded-xl border border-border p-4 text-sm">
          <p className="font-medium mb-2">
            {results.valid}/{results.total} profiles valid
            {results.invalid.length > 0 && (
              <span className="text-danger ml-1">({results.invalid.length} broken)</span>
            )}
          </p>
          {results.invalid.length > 0 && (
            <div className="space-y-1">
              {results.invalid.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <Link href={`/persons/${r.id}/edit`} className="text-accent hover:underline">
                    {r.name}
                  </Link>
                  <span className="text-danger">{r.linkedin}</span>
                </div>
              ))}
            </div>
          )}
          {results.invalid.length === 0 && (
            <p className="text-success text-xs">All LinkedIn profiles are valid!</p>
          )}
          <button
            onClick={() => setResults(null)}
            className="text-muted text-xs hover:underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
