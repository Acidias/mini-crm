"use client";

import { useState } from "react";
import { createApiKey } from "@/actions/api-keys";

export default function ApiKeyCreate() {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate(formData: FormData) {
    setIsCreating(true);
    try {
      const key = await createApiKey(formData);
      setNewKey(key);
      setName("");
    } finally {
      setIsCreating(false);
    }
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function dismissKey() {
    setNewKey(null);
    setCopied(false);
  }

  return (
    <div>
      {/* New key display */}
      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-green-800 mb-2">
            API key created. Copy it now - you won&apos;t be able to see it again.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-xs font-mono select-all break-all">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className={`px-3 py-2 rounded text-xs transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={dismissKey}
            className="text-xs text-green-600 hover:underline mt-2"
          >
            I&apos;ve saved it, dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <form action={handleCreate} className="flex gap-2">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. My Integration)"
          className="border border-border rounded-lg flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Generate Key"}
        </button>
      </form>
    </div>
  );
}
