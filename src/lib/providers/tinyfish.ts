import "server-only";

/**
 * TinyFish provider.
 *
 * TinyFish exposes a public Search API and Fetch API (both free inside a
 * daily allowance). We use them for *discovery* and for retrieving pages from
 * sources whose terms allow it.
 *
 * Official docs: https://docs.tinyfish.ai/search-api and /fetch-api
 * SDK:         @tiny-fish/sdk
 *
 * Nothing in this module knows about our domain model — it speaks TinyFish.
 */
import { TinyFish } from "@tiny-fish/sdk";
import {
  APIStatusError,
  APITimeoutError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "@tiny-fish/sdk";
import { z } from "zod";

import { AppError, redactSecrets } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { fetchResponseSchema, searchResponseSchema } from "@/lib/schema";

const PROVIDER = "tinyfish";

export interface TinyFishSearchOptions {
  query: string;
  purpose?: string;
  location?: string;
  language?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  page?: number;
}

export interface TinyFishFetchOptions {
  urls: string[];
  purpose?: string;
  /** Milliseconds. The Fetch API accepts up to 10 URLs per request. */
  perUrlTimeoutMs?: number;
}

let client: TinyFish | undefined;

function getClient(): TinyFish {
  if (client) return client;
  const env = getEnv();
  if (!env.TINYFISH_API_KEY) {
    throw new AppError("invalid_key", "TinyFish API key is not configured.", {
      provider: PROVIDER,
    });
  }
  client = new TinyFish({
    apiKey: env.TINYFISH_API_KEY,
    timeout: env.PROVIDER_TIMEOUT_MS,
    maxRetries: 2,
  });
  return client;
}

/** Translate a TinyFish SDK error into an AppError without leaking secrets. */
function mapError(error: unknown): AppError {
  const env = getEnv();
  const secrets = [env.TINYFISH_API_KEY];

  if (error instanceof AuthenticationError) {
    return new AppError("invalid_key", "TinyFish rejected the API key.", { provider: PROVIDER });
  }
  if (error instanceof PermissionDeniedError) {
    return new AppError("source_unavailable", "TinyFish refused this request.", {
      provider: PROVIDER,
    });
  }
  if (error instanceof RateLimitError) {
    return new AppError("rate_limited", "TinyFish rate limit reached. Try again shortly.", {
      provider: PROVIDER,
    });
  }
  if (error instanceof APITimeoutError) {
    return new AppError("timeout", "TinyFish request timed out.", { provider: PROVIDER });
  }
  if (error instanceof APIStatusError) {
    if (error.statusCode === 402) {
      return new AppError(
        "quota_exceeded",
        "TinyFish daily free allowance is exhausted and the wallet balance is empty.",
        { provider: PROVIDER },
      );
    }
    if (error.statusCode === 404) {
      return new AppError("source_unavailable", "The TinyFish search service is unavailable.", {
        provider: PROVIDER,
      });
    }
    if (error.statusCode === 503) {
      return new AppError("source_unavailable", "TinyFish is temporarily unavailable.", {
        provider: PROVIDER,
      });
    }
    return new AppError(
      "unknown",
      redactSecrets(`TinyFish request failed (${error.statusCode}).`, secrets),
      { provider: PROVIDER, details: error.code },
    );
  }

  return new AppError(
    "unknown",
    redactSecrets(error instanceof Error ? error.message : "TinyFish request failed.", secrets),
    { provider: PROVIDER },
  );
}

/**
 * Run a web search. The response is validated before it leaves this module,
 * so a malformed upstream payload can never reach the database.
 */
export async function tinyfishSearch(options: TinyFishSearchOptions) {
  const api = getClient();
  const params: Parameters<TinyFish["search"]["query"]>[0] = {
    query: options.query,
  };
  if (options.purpose) params.purpose = options.purpose.slice(0, 2000);
  if (options.location) params.location = options.location;
  if (options.language) params.language = options.language;
  if (options.includeDomains?.length) params.include_domains = options.includeDomains.join(",");
  if (options.excludeDomains?.length) params.exclude_domains = options.excludeDomains.join(",");
  if (typeof options.page === "number") params.page = options.page;

  try {
    const raw = await api.search.query(params);
    const parsed = searchResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError("malformed_response", "TinyFish returned an unexpected search payload.", {
        provider: PROVIDER,
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapError(error);
  }
}

/**
 * Retrieve page content. The Fetch API processes up to 10 URLs per request and
 * returns per-URL errors without failing the whole batch.
 */
export async function tinyfishFetch(options: TinyFishFetchOptions) {
  const api = getClient();
  if (options.urls.length === 0) return { results: [], errors: [] };

  const params: Parameters<TinyFish["fetch"]["getContents"]>[0] = {
    urls: options.urls.slice(0, 10),
    format: "markdown",
  };
  if (options.purpose) params.purpose = options.purpose.slice(0, 2000);
  if (options.perUrlTimeoutMs) params.per_url_timeout_ms = options.perUrlTimeoutMs;

  try {
    const raw = await api.fetch.getContents(params);
    const parsed = fetchResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError("malformed_response", "TinyFish returned an unexpected fetch payload.", {
        provider: PROVIDER,
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapError(error);
  }
}

/** Only used by tests — clears the memoised client. */
export function resetTinyFishClient(): void {
  client = undefined;
}

export const tinyfishProviderSchema = z.object({ ok: z.literal(true) });
