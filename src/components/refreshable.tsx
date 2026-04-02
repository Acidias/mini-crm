"use client";

import { useState, useEffect } from "react";

export const CONTENT_UPDATED_EVENT = "mini-crm:content-updated";

export function dispatchContentUpdated() {
  window.dispatchEvent(new CustomEvent(CONTENT_UPDATED_EVENT));
}

/**
 * Wraps server-rendered content that uses defaultValue inputs.
 * When the AI modifies data, this remounts children so they
 * pick up fresh server-rendered values after router.refresh().
 */
export function Refreshable({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    function handleUpdate() {
      // Small delay to let router.refresh() complete first
      setTimeout(() => setKey((k) => k + 1), 300);
    }
    window.addEventListener(CONTENT_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CONTENT_UPDATED_EVENT, handleUpdate);
  }, []);

  return <div key={key}>{children}</div>;
}
