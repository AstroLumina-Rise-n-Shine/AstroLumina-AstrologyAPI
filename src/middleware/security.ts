import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { defaultOrigins } from "../config/cors.js";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "no-referrer" },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },
});

export const permissionsPolicy = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  next();
};

// ─── CORS origins: normalised allowlist, never a wildcard ────────────────────
// Origins are split on commas, trimmed, de-duplicated, stripped of trailing
// slashes and validated as http/https URLs. A configured wildcard ("*") is
// rejected at startup instead of silently allowing every origin.
function normaliseOrigins(rawOrigins: readonly string[]): string[] {
  const origins = new Set<string>();

  for (const raw of rawOrigins) {
    const origin = raw.trim().replace(/\/+$/, "");
    if (!origin) continue;

    if (origin === "*") {
      throw new Error(
        "CORS wildcard ('*') is not allowed: configure explicit origins via CORS_ORIGINS",
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: "${origin}" is not a valid URL`);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(
        `Invalid CORS origin: "${origin}" must be an http or https URL`,
      );
    }

    origins.add(origin);
  }

  return [...origins];
}

export const corsOrigins: string[] = normaliseOrigins(
  env.CORS_ORIGINS ? env.CORS_ORIGINS.split(",") : defaultOrigins,
);

// Strict origin guard: runs before cors() so that browsers sending an Origin
// header that is not in the allowlist are rejected outright. Requests without
// an Origin header (server-to-server calls, curl, the ZAP scanner) pass
// through — the CORS spec does not send Origin for those contexts.
export function corsOriginGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin;
  if (origin && !corsOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
}

export const corsMiddleware = cors({
  origin: corsOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false,
  maxAge: 600,
  optionsSuccessStatus: 204,
});

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after a minute",
  },
});

// Stricter limiter for abuse-prone POST routes (paid upstream calls).
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
