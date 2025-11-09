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
    const throttler = FetchThrottler.getInstance(3, 1000);
    const mockFetch = createMockFetch();
    // @ts-ignore
    global.fetch = mockFetch;

    const start = Date.now();
    const requests = Array.from({ length: 7 }, (_, i) =>
      throttler.throttledFetch(`https://test.com/${i}`)
    );
    await Promise.all(requests);
    const duration = Date.now() - start;
    // 7 requests, 3 per second, so at least 3 seconds
    expect(duration).toBeGreaterThanOrEqual(2000);
    expect(mockFetch).toHaveBeenCalledTimes(7);
  });

  it("should resolve responses correctly", async () => {
    const throttler = FetchThrottler.getInstance();
    const mockFetch = createMockFetch();
    // @ts-ignore
    global.fetch = mockFetch;

    const res = await throttler.throttledFetch("https://test.com/abc");
    expect(res).toHaveProperty("ok", true);
    expect(res).toHaveProperty("url", "https://test.com/abc");
  });
});
