import { FetchThrottler } from "#src/utils/fetchThrottler";
/**
 * Fetches JSON from the given URL (GET or POST).
 * Returns parsed JSON or null if 404 or other error.
 */
export async function fetchJsonOrNull<T>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(url, options);
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
export async function throttleFetchJsonOrNull<T>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  const throttler = FetchThrottler.getInstance();
  try {
    const response = await throttler.throttledFetch(url, options);
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
