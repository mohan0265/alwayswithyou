import { z } from 'zod';

// API Request schemas
export const CreatePairingRequestSchema = z.object({
  studentEmail: z.string().email(),
  parentEmail: z.string().email(),
  orgId: z.string().uuid(),
});

export const AcceptPairingRequestSchema = z.object({
  pairingId: z.string().uuid(),
});

export const RevokePairingRequestSchema = z.object({
  pairingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const SendMessageRequestSchema = z.object({
  pairingId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'quick_text', 'photo_nudge']).default('text'),
});

export const UpdateUserSettingsRequestSchema = z.object({
  visibleToPartner: z.boolean().optional(),
  dndEnabled: z.boolean().optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    days: z.array(z.number().min(0).max(6)),
    timezone: z.string(),
  }).optional(),
  notifications: z.object({
    push: z.boolean(),
    email: z.boolean(),
    inApp: z.boolean(),
  }).optional(),
});

export const RegisterPushSubscriptionRequestSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  userAgent: z.string().optional(),
});

export const UploadMemoryRequestSchema = z.object({
  albumId: z.string().uuid(),
  title: z.string().max(100).optional(),
  caption: z.string().max(500).optional(),
  imageData: z.string(), // base64 encoded image
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
});

export const ApproveMemoryRequestSchema = z.object({
  memoryId: z.string().uuid(),
  approved: z.boolean(),
});

export const ReportRequestSchema = z.object({
  type: z.enum(['abuse', 'harassment', 'inappropriate_content', 'technical_issue', 'other']),
  description: z.string().min(10).max(1000),
  targetUserId: z.string().uuid().optional(),
  targetPairingId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  timestamp: z.date(),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(100),
    total: z.number().min(0),
    totalPages: z.number().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// WebSocket message schemas
export const WSMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  namespace: z.enum(['presence', 'chat', 'signaling']),
  data: z.record(z.any()),
  timestamp: z.date(),
  userId: z.string().uuid().optional(),
});

// Presence WebSocket messages
export const PresenceUpdateMessageSchema = WSMessageSchema.extend({
  type: z.literal('presence_update'),
  namespace: z.literal('presence'),
  data: z.object({
    userId: z.string().uuid(),
    status: z.enum(['online', 'away', 'busy', 'offline']),
    metadata: z.record(z.any()).optional(),
  }),
});

export const PresenceHeartbeatMessageSchema = WSMessageSchema.extend({
  type: z.literal('heartbeat'),
  namespace: z.literal('presence'),
  data: z.object({
    status: z.enum(['online', 'away', 'busy']).optional(),
  }),
});

// Chat WebSocket messages
export const ChatMessageSchema = WSMessageSchema.extend({
  type: z.literal('message'),
  namespace: z.literal('chat'),
  data: z.object({
    pairingId: z.string().uuid(),
    content: z.string(),
    messageType: z.enum(['text', 'quick_text', 'photo_nudge', 'system']),
    senderId: z.string().uuid(),
  }),
});

export const TypingIndicatorMessageSchema = WSMessageSchema.extend({
  type: z.literal('typing'),
  namespace: z.literal('chat'),
  data: z.object({
    pairingId: z.string().uuid(),
    userId: z.string().uuid(),
    isTyping: z.boolean(),
  }),
});

export const ReadReceiptMessageSchema = WSMessageSchema.extend({
  type: z.literal('read_receipt'),
  namespace: z.literal('chat'),
  data: z.object({
    messageId: z.string().uuid(),
    readBy: z.string().uuid(),
    readAt: z.date(),
  }),
});

// Signaling WebSocket messages
export const SignalingMessageSchema = WSMessageSchema.extend({
  namespace: z.literal('signaling'),
  data: z.object({
    callId: z.string().uuid(),
    pairingId: z.string().uuid(),
    senderId: z.string().uuid(),
    targetId: z.string().uuid(),
  }),
});

export const CallOfferMessageSchema = SignalingMessageSchema.extend({
  type: z.literal('call_offer'),
  data: SignalingMessageSchema.shape.data.extend({
    callType: z.enum(['video', 'voice']),
    offer: z.object({
      type: z.literal('offer'),
      sdp: z.string(),
    }),
  }),
});

export const CallAnswerMessageSchema = SignalingMessageSchema.extend({
  type: z.literal('call_answer'),
  data: SignalingMessageSchema.shape.data.extend({
    answer: z.object({
      type: z.literal('answer'),
      sdp: z.string(),
    }),
  }),
});

export const CallCandidateMessageSchema = SignalingMessageSchema.extend({
  type: z.literal('call_candidate'),
  data: SignalingMessageSchema.shape.data.extend({
    candidate: z.object({
      candidate: z.string(),
      sdpMLineIndex: z.number(),
      sdpMid: z.string(),
    }),
  }),
});

export const CallHangupMessageSchema = SignalingMessageSchema.extend({
  type: z.literal('call_hangup'),
  data: SignalingMessageSchema.shape.data.extend({
    reason: z.string().optional(),
  }),
});

// Export types
export type CreatePairingRequest = z.infer<typeof CreatePairingRequestSchema>;
export type AcceptPairingRequest = z.infer<typeof AcceptPairingRequestSchema>;
export type RevokePairingRequest = z.infer<typeof RevokePairingRequestSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type UpdateUserSettingsRequest = z.infer<typeof UpdateUserSettingsRequestSchema>;
export type RegisterPushSubscriptionRequest = z.infer<typeof RegisterPushSubscriptionRequestSchema>;
export type UploadMemoryRequest = z.infer<typeof UploadMemoryRequestSchema>;
export type ApproveMemoryRequest = z.infer<typeof ApproveMemoryRequestSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;

export type WSMessage = z.infer<typeof WSMessageSchema>;
export type PresenceUpdateMessage = z.infer<typeof PresenceUpdateMessageSchema>;
export type PresenceHeartbeatMessage = z.infer<typeof PresenceHeartbeatMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type TypingIndicatorMessage = z.infer<typeof TypingIndicatorMessageSchema>;
export type ReadReceiptMessage = z.infer<typeof ReadReceiptMessageSchema>;
export type SignalingMessage = z.infer<typeof SignalingMessageSchema>;
export type CallOfferMessage = z.infer<typeof CallOfferMessageSchema>;
export type CallAnswerMessage = z.infer<typeof CallAnswerMessageSchema>;
export type CallCandidateMessage = z.infer<typeof CallCandidateMessageSchema>;
export type CallHangupMessage = z.infer<typeof CallHangupMessageSchema>;

