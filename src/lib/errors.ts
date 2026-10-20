/**
 * Typed application errors.
 *
 * Every provider client throws one of these so route handlers can turn a
 * failure into a predictable HTTP status + a safe, human-readable message.
 * API keys are NEVER included in the message.
 */

export type ErrorCode =
  | "invalid_key"
  | "quota_exceeded"
  | "rate_limited"
  | "timeout"
  | "source_unavailable"
  | "malformed_response"
  | "not_found"
  | "validation_error"
  | "cancelled"
  | "unknown";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  invalid_key: 401,
  quota_exceeded: 402,
  rate_limited: 429,
  timeout: 504,
  source_unavailable: 502,
  malformed_response: 502,
  not_found: 404,
  validation_error: 400,
  cancelled: 499,
  unknown: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly provider?: string;
  readonly details?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options: { provider?: string; details?: string; status?: number } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? STATUS_BY_CODE[code];
    this.provider = options.provider;
    this.details = options.details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        provider: this.provider,
        details: this.details,
      },
    };
  }
}

/**
 * Strip anything that looks like a credential out of a provider error string.
 *
 * Providers sometimes echo request headers back in error payloads. We keep the
 * message useful but make sure a key can never reach a log or the browser.
 */
export function redactSecrets(message: string, secrets: Array<string | undefined>): string {
  let output = message;
  for (const secret of secrets) {
    if (!secret || secret.length < 8) continue;
    output = output.split(secret).join("[redacted]");
  }
  // Also catch generic `sk-...` style tokens and long hex/base64 blobs.
  output = output.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]");
  output = output.replace(/\bAIza[0-9A-Za-z_-]{10,}\b/g, "[redacted]");
  output = output.replace(/\b(?:tf|tk)_[A-Za-z0-9_-]{8,}\b/g, "[redacted]");
  return output;
}
