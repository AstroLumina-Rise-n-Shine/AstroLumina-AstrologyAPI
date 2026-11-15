// instrument.ts — must be imported before all other modules
import { env } from "./config/env.js";

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

if (env.ASTROLOGY_API_SENTRY_DSN) {
  const isProduction = env.NODE_ENV === "production";

  Sentry.init({
    dsn: env.ASTROLOGY_API_SENTRY_DSN,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE || undefined,

    sampleRate: 1.0,
    includeLocalVariables: true,
    maxBreadcrumbs: 100,

    tracesSampler: (samplingContext) => {
      // Sample 100% of API endpoints
      if (samplingContext?.transactionContext?.name?.includes("/api/")) {
        return 1.0;
      }
      if (samplingContext?.transactionContext?.name?.includes("/health")) {
        return 0.01;
      }
      return isProduction ? 0.2 : 1.0;
    },

    tracePropagationTargets: [
      "localhost",
      /^https:\/\/astrologer\.rapidapi\.com/,
      /^https:\/\/astrolumina\.pages\.dev/,
      /^https:\/\/develop\.astrolumina\.pages\.dev/,
      /^https:\/\/.*\.astrolumina\.com/,
      /^https:\/\/.*\.astrolumina\.ro/,
    ],

    integrations: [
      // @ts-expect-error — version mismatch between @sentry/node 10.x and @sentry/profiling-node 8.x
      nodeProfilingIntegration(),
      Sentry.captureConsoleIntegration({ levels: ["error", "warn"] }),
      Sentry.anrIntegration({ captureStackTrace: true }),
    ],
    profileSessionSampleRate: isProduction ? 0.1 : 1.0,
    profileLifecycle: "trace",
    autoSessionTracking: true,
    sendDefaultPii: true,
    beforeSend: (event, _hint) => {
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.value) {
            exception.value = exception.value
              .replace(
                /x-rapidapi-key['":\s]*['"]?[\w-]+['"]?/gi,
                "x-rapidapi-key=[REDACTED]",
              )
              .replace(
                /ASTROLOGER_API_KEY['":\s]*['"]?[\w-]+['"]?/gi,
                "ASTROLOGER_API_KEY=[REDACTED]",
              );
          }
        }
      }
      if (event.request?.data && typeof event.request.data === "object") {
        const data = event.request.data as Record<string, unknown>;
        if (data["x-rapidapi-key"]) data["x-rapidapi-key"] = "[REDACTED]";
      }
      return event;
    },

    beforeSendSpan: (span) => {
      span.data = { ...span.data, "service.name": "astrolumina-astrology-api" };
      return span;
    },

    initialScope: {
      tags: {
        service: "astrolumina-astrology-api",
        runtime: "node.js",
        framework: "express",
      },
    },

    enableLogs: true,
  });
}

export { Sentry };
