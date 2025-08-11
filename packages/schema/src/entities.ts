import { z } from 'zod';

// Base entity schema
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Organization schema
export const OrganizationSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().optional(),
  brandColors: z.record(z.string()).optional(),
  quickTexts: z.array(z.string()).optional(),
  policies: z.record(z.any()).optional(),
});

// Profile schema
export const ProfileSchema = BaseEntitySchema.extend({
  orgId: z.string().uuid(),
  authUserId: z.string().uuid().optional(),
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  userType: z.enum(['student', 'parent', 'admin']),
  timezone: z.string().default('UTC'),
  visibleToPartner: z.boolean().default(true),
  dndEnabled: z.boolean().default(false),
  quietHours: z.record(z.any()).optional(),
  pushSubscription: z.record(z.any()).optional(),
  lastSeenAt: z.date(),
});

// Pairing schema
export const PairingSchema = BaseEntitySchema.extend({
  orgId: z.string().uuid(),
  studentId: z.string().uuid(),
  parentId: z.string().uuid(),
  status: z.enum(['pending', 'active', 'paused', 'revoked']).default('pending'),
  invitedBy: z.string().uuid(),
  invitedAt: z.date(),
  acceptedAt: z.date().optional(),
  pausedAt: z.date().optional(),
  revokedAt: z.date().optional(),
});

// Presence schema
export const PresenceStateSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['online', 'away', 'busy', 'offline']).default('offline'),
  lastHeartbeat: z.date(),
  metadata: z.record(z.any()).optional(),
  updatedAt: z.date(),
});

// Message schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  pairingId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'quick_text', 'photo_nudge', 'system']).default('text'),
  metadata: z.record(z.any()).optional(),
  readAt: z.date().optional(),
  createdAt: z.date(),
});

// Call signal schema (for WebRTC)
export const CallSignalSchema = z.object({
  type: z.enum(['offer', 'answer', 'candidate', 'hangup']),
  pairingId: z.string().uuid(),
  callId: z.string().uuid(),
  senderId: z.string().uuid(),
  targetId: z.string().uuid(),
  data: z.record(z.any()),
  timestamp: z.date(),
});

// Call schema
export const CallSchema = BaseEntitySchema.extend({
  pairingId: z.string().uuid(),
  callerId: z.string().uuid(),
  calleeId: z.string().uuid(),
  callType: z.enum(['video', 'voice']),
  status: z.enum(['initiated', 'ringing', 'connected', 'ended', 'missed', 'declined']).default('initiated'),
  startedAt: z.date(),
  connectedAt: z.date().optional(),
  endedAt: z.date().optional(),
  durationSeconds: z.number().min(0).default(0),
  metadata: z.record(z.any()).optional(),
});

// Memory item schema
export const MemoryItemSchema = BaseEntitySchema.extend({
  albumId: z.string().uuid(),
  pairingId: z.string().uuid(),
  title: z.string().max(100).optional(),
  caption: z.string().max(500).optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  approved: z.boolean().default(false),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
  createdBy: z.string().uuid(),
});

// Album schema
export const AlbumSchema = BaseEntitySchema.extend({
  orgId: z.string().uuid(),
  pairingId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverImageUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
  createdBy: z.string().uuid(),
});

// Event schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  pairingId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(50),
  eventData: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
});

// Export types
export type Organization = z.infer<typeof OrganizationSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Pairing = z.infer<typeof PairingSchema>;
export type PresenceState = z.infer<typeof PresenceStateSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type CallSignal = z.infer<typeof CallSignalSchema>;
export type Call = z.infer<typeof CallSchema>;
export type MemoryItem = z.infer<typeof MemoryItemSchema>;
export type Album = z.infer<typeof AlbumSchema>;
export type Event = z.infer<typeof EventSchema>;

