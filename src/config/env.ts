import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),

  ASTROLOGY_API_SERVER_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "ASTROLOGY_API_SERVER_PORT is required"),

  ASTROLOGY_API_SENTRY_DSN: z
    .string()
    .url()
    .min(1, "ASTROLOGY_API_SENTRY_DSN is required"),

  // Set by the Docker build (SENTRY_RELEASE build-arg): ties runtime
  // events to the release whose source maps CI uploaded.
  SENTRY_RELEASE: z.string().optional(),

  CORS_ORIGINS: z.string().optional(),

  ASTROLOGER_API_KEY: z.string().min(1, "ASTROLOGER_API_KEY is required"),
  ASTROLOGER_API_URL: z.string().url("ASTROLOGER_API_URL must be a valid URL"),
  ASTROLOGER_API_HOST: z.string().min(1, "ASTROLOGER_API_HOST is required"),

  ASTROLOGY_API_SERVER_DC_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "ASTROLOGY_API_SERVER_DC_PORT is required"),
  ASTROLOGY_API_SERVER_DC_DNS: z
    .string()
    .min(1, "ASTROLOGY_API_SERVER_DC_DNS is required"),
  ASTROLOGY_API_SERVER_K8S_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "ASTROLOGY_API_SERVER_K8S_PORT is required"),
  ASTROLOGY_API_SERVER_K8S_DNS: z
    .string()
    .min(1, "ASTROLOGY_API_SERVER_K8S_DNS is required"),

  BOOKING_API_SERVER_DC_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "BOOKING_API_SERVER_DC_PORT is required"),
  BOOKING_API_SERVER_DC_DNS: z
    .string()
    .min(1, "BOOKING_API_SERVER_DC_DNS is required"),
  BOOKING_API_SERVER_K8S_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "BOOKING_API_SERVER_K8S_PORT is required"),
  BOOKING_API_SERVER_K8S_DNS: z
    .string()
    .min(1, "BOOKING_API_SERVER_K8S_DNS is required"),

  PAYMENT_API_SERVER_DC_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "PAYMENT_API_SERVER_DC_PORT is required"),
  PAYMENT_API_SERVER_DC_DNS: z
    .string()
    .min(1, "PAYMENT_API_SERVER_DC_DNS is required"),
  PAYMENT_API_SERVER_K8S_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "PAYMENT_API_SERVER_K8S_PORT is required"),
  PAYMENT_API_SERVER_K8S_DNS: z
    .string()
    .min(1, "PAYMENT_API_SERVER_K8S_DNS is required"),

  FRONTEND_SERVER_DC_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "FRONTEND_SERVER_DC_PORT is required"),
  FRONTEND_SERVER_DC_DNS: z
    .string()
    .min(1, "FRONTEND_SERVER_DC_DNS is required"),
  FRONTEND_SERVER_K8S_PORT: z.coerce
    .number()
    .int()
    .positive()
    .min(1, "FRONTEND_SERVER_K8S_PORT is required"),
  FRONTEND_SERVER_K8S_DNS: z
    .string()
    .min(1, "FRONTEND_SERVER_K8S_DNS is required"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
