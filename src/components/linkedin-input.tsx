"use client";

import { useState } from "react";

export default function LinkedInInput({
  defaultValue,
}: {
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue || "");
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  async function verify() {
    const url = value.trim();
    if (!url) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    try {
      const res = await fetch(`/api/verify-linkedin?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setStatus(data.valid ? "valid" : "invalid");
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          name="linkedin"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus("idle");
          }}
          onBlur={verify}
          className={`border rounded-lg flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent ${
            status === "valid"
              ? "border-success"
              : status === "invalid"
              ? "border-danger"
              : "border-border"
          }`}
          placeholder="https://linkedin.com/in/..."
        />
        <button
          type="button"
          onClick={verify}
          disabled={!value.trim() || status === "checking"}
          className="border border-border px-3 py-2 rounded-lg text-xs text-muted hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          {status === "checking" ? "..." : "Verify"}
        </button>
      </div>
      {status === "valid" && (
        <p className="text-success text-xs mt-1">LinkedIn profile found</p>
      )}
      {status === "invalid" && (
        <p className="text-danger text-xs mt-1">LinkedIn profile not found - check the URL</p>
      )}
    </div>
  );
}
