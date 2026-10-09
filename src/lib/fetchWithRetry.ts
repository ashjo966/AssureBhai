/**
 * Robust fetch wrapper with exponential backoff and jitter for transient network/cellular errors.
 */

export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryOnStatus?: number[];
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_RETRY_STATUSES = [408, 429, 502, 503, 504];

export function isRetryableNetworkError(err: unknown): boolean {
  if (!err) return false;
  if ((err as { name?: string })?.name === "AbortError") return false;

  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : String(err);
  const lower = msg.toLowerCase();

  return (
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("fetch failed") ||
    lower.includes("connection refused") ||
    lower.includes("connection reset") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("net::err") ||
    lower.includes("interrupted") ||
    lower.includes("socket hang up")
  );
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffFactor = 2,
    retryOnStatus = DEFAULT_RETRY_STATUSES,
    onRetry,
    signal,
    ...fetchOptions
  } = options;

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (true) {
    if (signal?.aborted) {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    try {
      const existingHeaders = (fetchOptions.headers as Record<string, string>) || {};
      const requestHeaders: Record<string, string> = {
        "bypass-tunnel-reminder": "true",
        ...existingHeaders,
      };

      const response = await fetch(input, {
        ...fetchOptions,
        headers: requestHeaders,
        signal,
      });

      // If status indicates transient server error or rate limiting, retry
      if (!response.ok && retryOnStatus.includes(response.status) && attempt < maxRetries) {
        attempt++;
        const jitter = 0.8 + Math.random() * 0.4;
        const delay = Math.min(maxDelayMs, currentDelay * jitter);

        if (onRetry) {
          onRetry(attempt, new Error(`HTTP ${response.status}`), delay);
        }

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, delay);
          if (signal) {
            const onAbort = () => {
              clearTimeout(timeout);
              signal.removeEventListener("abort", onAbort);
              const abortErr = new Error("The operation was aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            };
            signal.addEventListener("abort", onAbort, { once: true });
          }
        });

        currentDelay *= backoffFactor;
        continue;
      }

      return response;
    } catch (err: unknown) {
      if (signal?.aborted || (err as { name?: string })?.name === "AbortError") {
        throw err;
      }

      const isRetryable = isRetryableNetworkError(err);

      if (isRetryable && attempt < maxRetries) {
        attempt++;
        const jitter = 0.8 + Math.random() * 0.4;
        const delay = Math.min(maxDelayMs, currentDelay * jitter);

        if (onRetry) {
          onRetry(attempt, err, delay);
        }

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, delay);
          if (signal) {
            const onAbort = () => {
              clearTimeout(timeout);
              signal.removeEventListener("abort", onAbort);
              const abortErr = new Error("The operation was aborted");
              abortErr.name = "AbortError";
              reject(abortErr);
            };
            signal.addEventListener("abort", onAbort, { once: true });
          }
        });

        currentDelay *= backoffFactor;
        continue;
      }

      throw err;
    }
  }
}
