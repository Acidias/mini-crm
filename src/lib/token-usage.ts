export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

// Claude Sonnet 4 pricing (per token)
const PRICING = {
  input: 3 / 1_000_000,
  output: 15 / 1_000_000,
  cache_write: 3.75 / 1_000_000,
  cache_read: 0.30 / 1_000_000,
};

export function calculateCost(usage: TokenUsage): number {
  return (
    usage.input_tokens * PRICING.input +
    usage.output_tokens * PRICING.output +
    usage.cache_creation_input_tokens * PRICING.cache_write +
    usage.cache_read_input_tokens * PRICING.cache_read
  );
}

export const TOKEN_USAGE_EVENT = "mini-crm:token-usage";

export function dispatchTokenUsage(usage: TokenUsage) {
  window.dispatchEvent(
    new CustomEvent(TOKEN_USAGE_EVENT, { detail: usage })
  );
}
