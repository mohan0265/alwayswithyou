import { z } from 'zod';

// Provider configuration schemas
export const ProviderConfigSchema = z.object({
  type: z.enum(['primary', 'fallback', 'canary']),
  enabled: z.boolean().default(true),
  weight: z.number().min(0).max(100).default(100),
  config: z.record(z.any()),
});

export const ProvidersConfigSchema = z.object({
  push: z.object({
    webpush: ProviderConfigSchema.optional(),
    fcm: ProviderConfigSchema.optional(),
    apns: ProviderConfigSchema.optional(),
  }),
  ice: z.object({
    static: ProviderConfigSchema.optional(),
    twilio: ProviderConfigSchema.optional(),
    xyzturn: ProviderConfigSchema.optional(),
  }),
  moderation: z.object({
    openai: ProviderConfigSchema.optional(),
    none: ProviderConfigSchema.optional(),
  }),
  captioning: z.object({
    openai: ProviderConfigSchema.optional(),
    none: ProviderConfigSchema.optional(),
  }),
});

// Widget configuration schema
export const WidgetConfigSchema = z.object({
  orgId: z.string().uuid(),
  branding: z.object({
    logo: z.string().url().optional(),
    icon: z.string().url().optional(),
    colors: z.object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }),
    name: z.string().min(1).max(100),
  }),
  quickTexts: z.array(z.string().min(1).max(200)).max(20),
  policies: z.object({
    defaultVisibility: z.boolean().default(true),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      days: z.array(z.number().min(0).max(6)).max(7), // 0=Sunday, 6=Saturday
      timezone: z.string().default('UTC'),
    }),
    flashbackCap: z.number().min(0).max(10).default(3),
    dndRespected: z.boolean().default(true),
    memoryFlashbacks: z.object({
      enabled: z.boolean().default(true),
      dailyCap: z.number().min(0).max(10).default(3),
      quietHours: z.boolean().default(true),
      pauseDuration: z.number().min(1).max(168).default(24), // hours
    }),
  }),
  providers: ProvidersConfigSchema,
});

// User configuration schema
export const UserConfigSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  type: z.enum(['student', 'parent', 'admin']),
  timezone: z.string().default('UTC'),
  preferences: z.object({
    visibleToPartner: z.boolean().default(true),
    dndEnabled: z.boolean().default(false),
    quietHours: z.object({
      enabled: z.boolean().default(false),
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      days: z.array(z.number().min(0).max(6)),
      timezone: z.string().default('UTC'),
    }),
    notifications: z.object({
      push: z.boolean().default(true),
      email: z.boolean().default(true),
      inApp: z.boolean().default(true),
    }),
  }),
});

// Export types
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
export type UserConfig = z.infer<typeof UserConfigSchema>;

