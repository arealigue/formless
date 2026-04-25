import { NetworkError } from './errors.js';

interface RetryOptions {
  retryCount?: number;
  retryDelayMs?: number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const retryCount = options.retryCount ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 350;

  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, init);
      if (response.status >= 500 && response.status <= 599 && attempt < retryCount) {
        attempt += 1;
        await delay(retryDelayMs);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt >= retryCount) {
        throw new NetworkError(url, error);
      }

      attempt += 1;
      await delay(retryDelayMs);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}