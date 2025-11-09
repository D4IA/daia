import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchJsonOrNull } from "#src/adapters/httpAdapter.ts";

describe("fetchJsonOrNull", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns parsed JSON when response is ok", async () => {
    const mockJson = { value: 42 };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockJson),
    }) as any;

    const result = await fetchJsonOrNull<typeof mockJson>(
      "https://api.test/data"
    );
    expect(result).toEqual(mockJson);
  });

  it("returns null when status is 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn(),
    }) as any;

    const result = await fetchJsonOrNull("https://api.test/not-found");
    expect(result).toBeNull();
  });

  it("returns null when response status is not ok (e.g. 500)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn(),
    }) as any;

    const result = await fetchJsonOrNull("https://api.test/error");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await fetchJsonOrNull("https://api.test/down");
    expect(result).toBeNull();
  });

  it("passes options correctly to fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    }) as any;

    const options = { method: "POST", body: JSON.stringify({ x: 123 }) };

    await fetchJsonOrNull("https://api.test/post", options);

    expect(global.fetch).toHaveBeenCalledWith("https://api.test/post", options);
  });
});
