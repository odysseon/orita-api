import { z } from 'zod';

export const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    GLOBAL_PREFIX: z.string().default('api'),
    DATABASE_URL: z.string().url(),
    FRONTEND_URL: z.string().url(),
    ALLOWED_ORIGINS: z.string().optional(),

    // ── Storage ───────────────────────────────────────────────────────────
    STORAGE_PROVIDER: z.enum(['cloudinary', 'backblaze']).default('cloudinary'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    B2_APPLICATION_KEY_ID: z.string().optional(),
    B2_APPLICATION_KEY: z.string().optional(),
    B2_ENDPOINT: z.string().optional(),
    B2_REGION: z.string().optional(),
    B2_BUCKET_NAME: z.string().optional(),
    B2_PUBLIC_URL_BASE: z.string().optional(),
    CDN_URL: z.string().url().default('https://cdn.orita.app'),
    MEDIA_URL: z.string().url().default('https://media.orita.app'),
    WS_URL: z.string().url().default('wss://api.orita.app'),

    // ── Receipt Secret ────────────────────────────────────────────────────
    RECEIPT_SECRET: z.string().min(32),

    // ── Google Auth ───────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: z.string().optional(),

    // ── Mailer ────────────────────────────────────────────────────────────
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),

    // ── Redis ─────────────────────────────────────────────────────────────
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    // ── PostHog ───────────────────────────────────────────────────────────
    POSTHOG_API_KEY: z.string().optional(),

    // ── Swagger ───────────────────────────────────────────────────────────
    SWAGGER_ENABLED: z.coerce.boolean().default(false),
    SWAGGER_USER: z.string().optional(),
    SWAGGER_PASS: z.string().optional(),
    SWAGGER_PATH_DOCS: z.string().default('api/docs'),
    SWAGGER_PATH_JSON: z.string().default('api/docs-json'),
    SWAGGER_TITLE: z.string().default('Orita API'),
    SWAGGER_DESCRIPTION: z
      .string()
      .default(
        'Local discovery platform connecting people with businesses, services, and opportunities around them',
      ),
    SWAGGER_VERSION: z.string().default('1.0'),
    SWAGGER_TAG_NAME: z.string().default('events'),
    SWAGGER_TAG_DESC: z.string().default('Event management endpoints'),

    // ── VAPID (Push Notifications) ────────────────────────────────────────
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default('mailto:support@orita.com'),

    // ── Application Limits ────────────────────────────────────────────────
    MAX_CONVERSATION_ATTACHMENTS: z.coerce.number().default(10),
    MAX_ATTACHMENT_SIZE_MB: z.coerce.number().default(25),
    MAX_NEARBY_IMAGES: z.coerce.number().default(5),
    MAX_AVATAR_SIZE_MB: z.coerce.number().default(5),
    MAX_BUSINESS_COVER_PHOTOS: z.coerce.number().default(10),

    // ── Application Version ───────────────────────────────────────────────
    APP_VERSION: z.string().default('1.8.0'),
    API_VERSION: z.string().default('v1'),
    MINIMUM_SUPPORTED_CLIENT: z.string().default('1.6.0'),
  })

  .refine((d) => d.NODE_ENV !== 'production' || !!d.GOOGLE_CLIENT_ID, {
    message: 'GOOGLE_CLIENT_ID is required in production',
    path: ['GOOGLE_CLIENT_ID'],
  });

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  try {
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${msg}`, {
        cause: error,
      });
    }
    throw error;
  }
}
