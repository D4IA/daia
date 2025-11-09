import { describe, it, expect, vi } from "vitest";
import { FetchThrottler } from "#src/utils/fetchThrottler.ts";

function createMockFetch(delay = 10) {
  return vi.fn((url: string) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ url, ok: true }), delay);
    });
  });
}

describe("FetchThrottler", () => {
  it("should throttle requests to max 3 per second", async () => {
    vi.useFakeTimers();

    const throttler = FetchThrottler.getInstance(3, 1000);
    const mockFetch = createMockFetch();
    global.fetch = mockFetch as any;

    const requests = Array.from({ length: 7 }, (_, i) =>
      throttler.throttledFetch(`https://test.com/${i}`)
    );

    // TICK 1 second → first 3 requests released
    await vi.advanceTimersByTimeAsync(1000);

    // TICK 2 second → next 3 released
    await vi.advanceTimersByTimeAsync(1000);

    // TICK 3 second → last 1 released
    await vi.advanceTimersByTimeAsync(1000);

    await Promise.all(requests);

    expect(mockFetch).toHaveBeenCalledTimes(7);
  });
});
