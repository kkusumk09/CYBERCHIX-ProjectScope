import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchMock, fetchMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@tiny-fish/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiny-fish/sdk")>();
  class FakeTinyFish {
    search = { query: searchMock };
    fetch = { getContents: fetchMock };
  }
  return { ...actual, TinyFish: FakeTinyFish };
});

import {
  AuthenticationError,
  RateLimitError,
  APIStatusError,
} from "@tiny-fish/sdk";

import { AppError } from "@/lib/errors";
import { resetTinyFishClient, tinyfishFetch, tinyfishSearch } from "@/lib/providers/tinyfish";

function statusError(status: number, code?: string) {
  return new APIStatusError("boom", {
    response: new Response("{}"),
    statusCode: status,
    code,
  });
}

describe("tinyfish search", () => {
  beforeEach(() => {
    resetTinyFishClient();
    searchMock.mockReset();
    fetchMock.mockReset();
  });

  it("passes the query and domain filter through and returns validated data", async () => {
    searchMock.mockResolvedValue({
      query: "offline ai",
      total_results: 1,
      page: 0,
      results: [
        {
          position: 1,
          site_name: "devpost.com",
          title: "A project",
          snippet: "A snippet",
          url: "https://devpost.com/software/a",
        },
      ],
    });

    const result = await tinyfishSearch({
      query: "offline ai",
      includeDomains: ["devpost.com"],
      purpose: "find hackathon projects",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].url).toBe("https://devpost.com/software/a");
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0][0]).toMatchObject({
      query: "offline ai",
      include_domains: "devpost.com",
      purpose: "find hackathon projects",
    });
  });

  it("rejects a malformed payload instead of storing it", async () => {
    searchMock.mockResolvedValue({
      query: "x",
      total_results: 1,
      page: 0,
      results: [{ position: 1, site_name: "a" }],
    });

    await expect(tinyfishSearch({ query: "x" })).rejects.toBeInstanceOf(AppError);
    await expect(tinyfishSearch({ query: "x" })).rejects.toMatchObject({
      code: "malformed_response",
    });
  });

  it("maps an authentication failure to invalid_key", async () => {
    searchMock.mockRejectedValue(
      new AuthenticationError("bad key", { response: new Response("{}") }),
    );

    await expect(tinyfishSearch({ query: "x" })).rejects.toMatchObject({
      code: "invalid_key",
      provider: "tinyfish",
    });
  });

  it("maps a rate limit to rate_limited", async () => {
    searchMock.mockRejectedValue(new RateLimitError("slow down", { response: new Response("{}") }));

    await expect(tinyfishSearch({ query: "x" })).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("maps a 402 to quota_exceeded", async () => {
    searchMock.mockRejectedValue(statusError(402, "INSUFFICIENT_CREDITS"));

    await expect(tinyfishSearch({ query: "x" })).rejects.toMatchObject({ code: "quota_exceeded" });
  });

  it("never leaks the API key in an error message", async () => {
    searchMock.mockRejectedValue(
      statusError(500, "INTERNAL"),
    );
    // The thrown error must not contain the configured key.
    try {
      await tinyfishSearch({ query: "x" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("test-tinyfish-key");
    }
  });
});

describe("tinyfish fetch", () => {
  beforeEach(() => {
    resetTinyFishClient();
    searchMock.mockReset();
    fetchMock.mockReset();
  });

  it("returns the pages and the per-URL errors", async () => {
    fetchMock.mockResolvedValue({
      results: [
        {
          url: "https://unstop.com/competitions/x",
          final_url: "https://unstop.com/competitions/x",
          title: "A competition",
          description: null,
          language: "en",
          author: null,
          published_date: null,
          format: "markdown",
          text: "# A competition",
        },
      ],
      errors: [{ url: "https://unstop.com/p/y", error: "timeout" }],
    });

    const result = await tinyfishFetch({ urls: ["https://unstop.com/competitions/x"] });

    expect(result.results).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("timeout");
  });

  it("never asks for more than ten urls in one request", async () => {
    fetchMock.mockResolvedValue({ results: [], errors: [] });

    const urls = Array.from({ length: 15 }, (_, index) => `https://example.com/${index}`);
    await tinyfishFetch({ urls });

    expect(fetchMock.mock.calls[0][0].urls).toHaveLength(10);
  });

  it("returns immediately for an empty url list", async () => {
    const result = await tinyfishFetch({ urls: [] });
    expect(result.results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
