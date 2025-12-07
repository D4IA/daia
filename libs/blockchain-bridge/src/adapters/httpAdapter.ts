import { getBridgeConfig } from "#src/config";
import { FetchThrottler } from "#src/adapters/fetchThrottler";

/**
 * Fetches JSON from the given URL (GET or POST).
 * Returns parsed JSON or null if 404 or other error.
 */
export async function fetchJsonOrNull<T>(
  url: string,
  options?: RequestInit,
  fetchFn: (url: string, options?: RequestInit) => Promise<Response> = fetch
): Promise<T | null> {
  try {
    const { apiKey } = getBridgeConfig();

    const headers = new Headers(options?.headers);
    if (apiKey) {
      headers.set("Authorization", apiKey);
    }

    const response = await fetchFn(url, { ...options, headers });

    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`HTTP error: ${response.status} for ${url}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Fetches text from the given URL (GET or POST).
 * Returns text or null if 404 or other error.
 */
export async function fetchTextOrNull(
  url: string,
  options?: RequestInit,
  fetchFn: (url: string, options?: RequestInit) => Promise<Response> = fetch
): Promise<string | null> {
  try {
    const { apiKey } = getBridgeConfig();

    const headers = new Headers(options?.headers);
    if (apiKey) {
      headers.set("Authorization", apiKey);
    }

    const response = await fetchFn(url, { ...options, headers });

    if (response.status === 404) return null;
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error: ${response.status} for ${url}`);
      console.error(`Error response:`, errorText);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Fetches JSON from the given URL (GET or POST) using throttling.
 * Returns parsed JSON or null if 404 or other error.
 */
export function throttleFetchJsonOrNull<T>(url: string, options?: RequestInit) {
  const throttler = FetchThrottler.getInstance();
  return fetchJsonOrNull<T>(
    url,
    options,
    throttler.throttledFetch.bind(throttler)
  );
}

/**
 * Fetches text from the given URL (GET or POST) using throttling.
 * Returns text or null if 404 or other error.
 */
export function throttleFetchTextOrNull(url: string, options?: RequestInit) {
  const throttler = FetchThrottler.getInstance();
  return fetchTextOrNull(
    url,
    options,
    throttler.throttledFetch.bind(throttler)
  );
}
