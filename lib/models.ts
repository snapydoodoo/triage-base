// F5: which LLM models the user can pick, and how much each one costs.

export const DEFAULT_MODEL = process.env.LLM_MODEL || "gemini-flash-latest";

/** LLM_MODELS=gemini-flash-latest,gemini-flash-lite-latest in .env.local enables the model menu. */
export function availableModels(): string[] {
  const extra = (process.env.LLM_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([DEFAULT_MODEL, ...extra]));
}

// USD per 1 million tokens, at the PAID price (the free tier costs $0, but the estimate
// shows what production would cost). ⚠️ Check https://ai.google.dev/gemini-api/docs/pricing
// and update these numbers if they changed.
const PRICES: Record<string, { input: number; output: number }> = {
  "gemini-flash-latest": { input: 0.3, output: 2.5 },
  "gemini-flash-lite-latest": { input: 0.1, output: 0.4 },
  "gemini-pro-latest": { input: 1.25, output: 10 },
  // Decision model: free hosted API (decision.vllm-sr.ai)
  "vllm-sr/d3-turbo": { input: 0, output: 0 },
  "vllm-sr/d3": { input: 0, output: 0 },
};

export function costUsd(model: string, usage: { input: number; output: number }): number {
  const price = PRICES[model];
  if (!price) return 0; // unknown model: shown as $0, add it to PRICES
  return (usage.input * price.input + usage.output * price.output) / 1_000_000;
}
