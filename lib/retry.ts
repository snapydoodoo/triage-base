// Free tiers rate-limit us (HTTP 429). Wait and try again instead of failing the whole smoke test.
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status;
      const retryable = status === 429 || status === 500 || status === 503;
      if (!retryable || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}
