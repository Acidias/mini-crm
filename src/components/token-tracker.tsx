"use client";

import { useState, useEffect, useCallback } from "react";
import { TOKEN_USAGE_EVENT, calculateCost, type TokenUsage } from "@/lib/token-usage";

const STORAGE_KEY = "mini-crm:token-usage-cumulative";

const EMPTY: TokenUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

function loadUsage(): TokenUsage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { ...EMPTY };
}

function saveUsage(usage: TokenUsage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch { /* ignore */ }
}

export function TokenTracker() {
  const [cumulative, setCumulative] = useState<TokenUsage>(EMPTY);
  const [expanded, setExpanded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setCumulative(loadUsage());
  }, []);

  // Listen for new usage events and persist
  useEffect(() => {
    function handleUsage(e: Event) {
      const usage = (e as CustomEvent<TokenUsage>).detail;
      setCumulative((prev) => {
        const next = {
          input_tokens: prev.input_tokens + usage.input_tokens,
          output_tokens: prev.output_tokens + usage.output_tokens,
          cache_creation_input_tokens: prev.cache_creation_input_tokens + usage.cache_creation_input_tokens,
          cache_read_input_tokens: prev.cache_read_input_tokens + usage.cache_read_input_tokens,
        };
        saveUsage(next);
        return next;
      });
    }
    window.addEventListener(TOKEN_USAGE_EVENT, handleUsage);
    return () => window.removeEventListener(TOKEN_USAGE_EVENT, handleUsage);
  }, []);

  const total = cumulative.input_tokens + cumulative.output_tokens;
  const cost = calculateCost(cumulative);

  const resetUsage = useCallback(() => {
    setCumulative({ ...EMPTY });
    saveUsage(EMPTY);
  }, []);

  return (
    <div className="px-4 py-3 border-t border-white/10 text-[10px] text-sidebar-text/60">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sidebar-text/80 font-medium text-[11px] hover:text-white transition-colors"
      >
        <span>Tokens: {total > 0 ? total.toLocaleString() : "0"}</span>
        <span>${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>Input</span>
            <span>{cumulative.input_tokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Output</span>
            <span>{cumulative.output_tokens.toLocaleString()}</span>
          </div>
          {cumulative.cache_creation_input_tokens > 0 && (
            <div className="flex justify-between">
              <span>Cache write</span>
              <span>{cumulative.cache_creation_input_tokens.toLocaleString()}</span>
            </div>
          )}
          {cumulative.cache_read_input_tokens > 0 && (
            <div className="flex justify-between">
              <span>Cache read</span>
              <span>{cumulative.cache_read_input_tokens.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-1 mt-1 text-sidebar-text/80">
            <span>Total</span>
            <span>{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sidebar-text/80">
            <span>Est. cost</span>
            <span>${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}</span>
          </div>
          {total > 0 && (
            <button
              onClick={resetUsage}
              className="w-full text-center text-sidebar-text/40 hover:text-white/70 transition-colors mt-1 text-[9px]"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
