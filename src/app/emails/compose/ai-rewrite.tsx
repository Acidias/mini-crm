"use client";

import { useState, useEffect } from "react";

export default function AiRewrite({
  formId,
}: {
  formId: string;
}) {
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setApiKey(localStorage.getItem("claude-api-key") || "");
  }, []);

  async function handleRewrite() {
    if (!instruction.trim() || isLoading) return;
    if (!apiKey) {
      setError("Set your Claude API key on the AI Chat page first.");
      return;
    }

    const form = document.getElementById(formId) as HTMLFormElement;
    if (!form) return;

    const subjectEl = form.querySelector<HTMLInputElement>('input[name="subject"]');
    const bodyEl = form.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
    const toEl = form.querySelector<HTMLInputElement>('input[name="to"]');

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          subject: subjectEl?.value || "",
          body: bodyEl?.value || "",
          to: toEl?.value || "",
          instruction: instruction.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Rewrite failed");
        return;
      }

      // Update the form fields
      if (subjectEl && data.subject) {
        subjectEl.value = data.subject;
        subjectEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (bodyEl && data.body) {
        bodyEl.value = data.body;
        bodyEl.dispatchEvent(new Event("input", { bubbles: true }));
      }

      setInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }

  if (!apiKey) return null;

  return (
    <div className="border border-purple-200 bg-purple-50/50 rounded-lg px-3 py-2.5">
      <div className="flex gap-2 items-center">
        <span className="text-purple-600 text-xs font-medium flex-shrink-0">AI</span>
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRewrite();
            }
          }}
          placeholder="e.g. Make it shorter, more formal, add a call to action..."
          disabled={isLoading}
          className="flex-1 bg-transparent border-0 text-sm focus:outline-none placeholder:text-purple-300"
        />
        <button
          type="button"
          onClick={handleRewrite}
          disabled={isLoading || !instruction.trim()}
          className="text-purple-600 text-xs font-medium hover:text-purple-800 disabled:opacity-50 flex-shrink-0"
        >
          {isLoading ? "Rewriting..." : "Rewrite"}
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
