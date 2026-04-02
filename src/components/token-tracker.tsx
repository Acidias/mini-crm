"use client";

import { useState, useEffect } from "react";
import { TOKEN_USAGE_EVENT, calculateCost, type TokenUsage } from "@/lib/token-usage";

export function TokenTracker() {
  const [cumulative, setCumulative] = useState<TokenUsage>({
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  });

  useEffect(() => {
    function handleUsage(e: Event) {
      const usage = (e as CustomEvent<TokenUsage>).detail;
      setCumulative((prev) => ({
        input_tokens: prev.input_tokens + usage.input_tokens,
        output_tokens: prev.output_tokens + usage.output_tokens,
        cache_creation_input_tokens: prev.cache_creation_input_tokens + usage.cache_creation_input_tokens,
        cache_read_input_tokens: prev.cache_read_input_tokens + usage.cache_read_input_tokens,
      }));
    }
    window.addEventListener(TOKEN_USAGE_EVENT, handleUsage);
    return () => window.removeEventListener(TOKEN_USAGE_EVENT, handleUsage);
  }, []);

  const total = cumulative.input_tokens + cumulative.output_tokens;
  const cost = calculateCost(cumulative);

  if (total === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-white/10 text-[10px] text-sidebar-text/60 space-y-1">
      <div className="text-sidebar-text/80 font-medium text-[11px] mb-1">Token Usage</div>
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
    </div>
  );
}
