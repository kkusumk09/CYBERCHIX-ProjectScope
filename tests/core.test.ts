import { describe, expect, it } from "vitest";

import { AppError, redactSecrets } from "@/lib/errors";
import { parseJson, stringifyJson } from "@/lib/json";
import { zodToJsonSchema } from "@/lib/ai-json";
import { geminiReportSchema, openAiNormaliseSchema } from "@/lib/ai-schemas";
import { z } from "zod";

describe("secret redaction", () => {
  it("removes a known key from a message", () => {
    const key = "tf_live_abcdefghijklmnop";
    const message = `Request failed with key ${key} attached`;
    const redacted = redactSecrets(message, [key]);
    expect(redacted).not.toContain(key);
    expect(redacted).toContain("[redacted]");
  });

  it("removes generic token shapes even when the value is unknown", () => {
    expect(redactSecrets("token sk-abcdefghijklmnop", [])).not.toContain("sk-abcdefghijklmnop");
    expect(redactSecrets("key AIzaSyABCDEFGHIJKLMNOP", [])).not.toContain("AIzaSyABCDEFGHIJKLMNOP");
  });

  it("ignores very short values so it does not blank out the message", () => {
    expect(redactSecrets("a short value", ["a"])).toBe("a short value");
  });
});

describe("AppError", () => {
  it("maps codes to sensible HTTP statuses", () => {
    expect(new AppError("invalid_key", "x").status).toBe(401);
    expect(new AppError("rate_limited", "x").status).toBe(429);
    expect(new AppError("timeout", "x").status).toBe(504);
    expect(new AppError("not_found", "x").status).toBe(404);
    expect(new AppError("validation_error", "x").status).toBe(400);
  });

  it("serialises without leaking anything unexpected", () => {
    const error = new AppError("invalid_key", "Bad key", { provider: "openai" });
    expect(error.toJSON()).toEqual({
      error: { code: "invalid_key", message: "Bad key", provider: "openai", details: undefined },
    });
  });
});

describe("json helpers", () => {
  it("round-trips a value", () => {
    expect(parseJson(stringifyJson({ a: 1 }), {})).toEqual({ a: 1 });
  });

  it("falls back when the stored value is corrupt", () => {
    expect(parseJson("{not json", { fallback: true })).toEqual({ fallback: true });
  });

  it("falls back when the stored value does not match the schema", () => {
    const schema = z.object({ a: z.number() });
    expect(parseJson(JSON.stringify({ a: "nope" }), { a: 0 }, schema)).toEqual({ a: 0 });
  });
});

describe("zod to JSON schema", () => {
  it("produces a self-contained schema with no $defs or $schema", () => {
    const schema = zodToJsonSchema(openAiNormaliseSchema);
    expect(schema.$schema).toBeUndefined();
    expect(schema.$defs).toBeUndefined();
    expect(JSON.stringify(schema)).not.toContain("$ref");
  });

  it("marks objects as closed so the provider does not invent fields", () => {
    const schema = zodToJsonSchema(geminiReportSchema);
    expect(schema.additionalProperties).toBe(false);
  });

  it("keeps nested object definitions inline", () => {
    const schema = zodToJsonSchema(geminiReportSchema);
    const gaps = (schema.properties as Record<string, { items?: { properties?: unknown } }>).gaps;
    expect(gaps?.items?.properties).toBeDefined();
  });
});
