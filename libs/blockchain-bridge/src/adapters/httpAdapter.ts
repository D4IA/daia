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
    const response = await fetchFn(url, options);

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
