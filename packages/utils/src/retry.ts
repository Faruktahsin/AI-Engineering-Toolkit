export interface RetryOptions {
  readonly retries?: number; // Default: 3
  readonly minTimeoutMs?: number; // Default: 100
  readonly factor?: number; // Default: 2
  readonly onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Retries an asynchronous function with exponential backoff.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.retries ?? 3;
  const minTimeout = options?.minTimeoutMs ?? 100;
  const factor = options?.factor ?? 2;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }

      if (options?.onRetry && err instanceof Error) {
        options.onRetry(err, attempt);
      }

      const delay = minTimeout * factor ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
