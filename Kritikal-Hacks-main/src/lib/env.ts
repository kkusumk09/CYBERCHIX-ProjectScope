import "server-only";

/**
 * Server-side environment configuration.
 *
 * Secrets are read here and nowhere else. This module is guarded with
 * `server-only`, so importing it from a client component fails the build
 * instead of leaking a key to the browser.
 */
import { z } from "zod";

const envSchema = z.object({
  /** TinyFish — web discovery. */
  TINYFISH_API_KEY: z.string().min(1).optional(),
  /** OpenAI — normalisation, clustering, comparison, pitch review. */
  OPENAI_API_KEY: z.string().min(1).optional(),
  /** Gemini — market-gap synthesis. */
  GEMINI_API_KEY: z.string().min(1).optional(),

  /** Model ids are configurable so you can pin a snapshot you have tested. */
  OPENAI_MODEL: z.string().min(1).default("gpt-6.1-sol"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),

  DATABASE_URL: z.string().min(1).default("file:./dev.db"),

  /** Force demo mode even when credentials are present. */
  DEMO_MODE: z.enum(["true", "false"]).optional(),

  /** Upper bound on results collected per research run. */
  MAX_RESULTS_LIMIT: z.coerce.number().int().min(1).max(200).default(40),

  /** Timeout applied to every outbound provider call. */
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(45_000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    TINYFISH_API_KEY: process.env.TINYFISH_API_KEY || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    DEMO_MODE: process.env.DEMO_MODE || undefined,
    MAX_RESULTS_LIMIT: process.env.MAX_RESULTS_LIMIT || undefined,
    PROVIDER_TIMEOUT_MS: process.env.PROVIDER_TIMEOUT_MS || undefined,
  });

  if (!parsed.success) {
    // Never echo the raw values — only the field names that failed.
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration for: ${fields}`);
  }

  return parsed.data;
}

let cached: Env | undefined;

/** Lazily read (and cache) the validated environment. */
export function getEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

export type ProviderName = "tinyfish" | "openai" | "gemini";

export interface ProviderStatus {
  name: ProviderName;
  configured: boolean;
  model?: string;
}

/**
 * Which providers are usable right now. Used by the UI to show a clearly
 * labelled demo mode instead of pretending live research ran.
 */
export function getProviderStatus(): ProviderStatus[] {
  const env = getEnv();
  const forcedDemo = env.DEMO_MODE === "true";
  return [
    {
      name: "tinyfish",
      configured: !forcedDemo && Boolean(env.TINYFISH_API_KEY),
    },
    {
      name: "openai",
      configured: !forcedDemo && Boolean(env.OPENAI_API_KEY),
      model: env.OPENAI_MODEL,
    },
    {
      name: "gemini",
      configured: !forcedDemo && Boolean(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL,
    },
  ];
}

/** True when no live provider is available and we must fall back to demo data. */
export function isDemoMode(): boolean {
  if (getEnv().DEMO_MODE === "true") return true;
  return getProviderStatus().every((provider) => !provider.configured);
}
