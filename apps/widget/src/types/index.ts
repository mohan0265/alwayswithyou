import type { WidgetConfig, Message, PresenceStatus, CallState } from '@awy/schema';

export interface AWYWidgetProps {
  /** Organization ID */
  orgId: string;
  /** Current user ID */
  userId: string;
  /** API base URL */
  apiUrl: string;
  /** WebSocket base URL */
  wsUrl: string;
  /** Authentication token */
  authToken: string;
  /** Error callback */
  onError?: (error: string) => void;
  /** Ready callback */
  onReady?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

export interface WidgetState {
  /** Widget configuration */
  config: WidgetConfig | null;
  /** Is widget open */
  isOpen: boolean;
  /** Active tab */
  activeTab: 'home' | 'chat' | 'memories' | 'settings';
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Self online status */
  selfOnline: boolean;
  /** Partner presence */
  partnerPresence: PresenceStatus | null;
  /** Messages */
  messages: Message[];
  /** Call state */
  callState: CallState | null;
  /** Is in call */
  isInCall: boolean;
}

export interface WidgetServiceConfig {
  orgId: string;
  userId: string;
  apiUrl: string;
  wsUrl: string;
  authToken: string;
}

export interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'quick_text' | 'system';
  timestamp: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface CallData {
  id: string;
  type: 'video' | 'voice';
  status: 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended';
  participants: {
    caller: string;
    callee: string;
  };
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  duration?: number;
}

export interface QuickText {
  id: string;
  text: string;
  category?: string;
  emoji?: string;
}

export interface Memory {
  id: string;
  title?: string;
  caption?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  createdBy: string;
  createdAt: string;
  approved: boolean;
  albumId: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  namespace: string;
  data: any;
  timestamp: string;
}

export interface ConnectionState {
  presence: 'connected' | 'connecting' | 'disconnected';
  chat: 'connected' | 'connecting' | 'disconnected';
  signaling: 'connected' | 'connecting' | 'disconnected';
}

export interface WidgetEvents {
  'presence:update': PresenceData;
  'chat:message': ChatMessage;
  'chat:typing': { userId: string; isTyping: boolean };
  'call:incoming': CallData;
  'call:ended': CallData;
  'notification:received': NotificationPayload;
  'connection:state': ConnectionState;
  'error': { message: string; code?: string };
}

export type WidgetEventHandler<T extends keyof WidgetEvents> = (data: WidgetEvents[T]) => void;

export interface WidgetAPI {
  /** Start a call */
  startCall: (type: 'video' | 'voice') => Promise<void>;
  /** Send a message */
  sendMessage: (content: string, type?: 'text' | 'quick_text') => Promise<void>;
  /** Update presence status */
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline', metadata?: Record<string, any>) => Promise<void>;
  /** Subscribe to push notifications */
  subscribeToPush: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribeFromPush: () => Promise<boolean>;
  /** Update user settings */
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  /** Upload memory */
  uploadMemory: (file: File, title?: string, caption?: string) => Promise<Memory>;
  /** Get connection state */
  getConnectionState: () => ConnectionState;
  /** Add event listener */
  on: <T extends keyof WidgetEvents>(event: T, handler: WidgetEventHandler<T>) => void;
  /** Remove event listener */
  off: <T extends keyof WidgetEvents>(event: T, handler: WidgetEventHandler<T>) => void;
  /** Destroy widget */
  destroy: () => void;
}

export interface UserSettings {
  visibleToPartner: boolean;
  dndEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    days: number[];
    timezone: string;
  };
  notifications: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
}

export interface PanelProps {
  config: WidgetConfig | null;
  widgetService: any;
}

export interface HomePanelProps extends PanelProps {
  partnerPresence: PresenceData | null;
  onStartCall: (type: 'video' | 'voice') => void;
  onQuickText: () => void;
  isInCall: boolean;
}

export interface ChatPanelProps extends PanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  isTyping: boolean;
  onSendMessage: (content: string, type?: 'text' | 'quick_text') => Promise<void>;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onSetTyping: (isTyping: boolean) => void;
}

export interface MemoriesPanelProps extends PanelProps {
  // Additional props specific to memories panel
}

export interface SettingsPanelProps extends PanelProps {
  pushSupported: boolean;
  pushSubscribed: boolean;
  onSubscribeToPush: () => Promise<boolean>;
  onUnsubscribeFromPush: () => Promise<boolean>;
}

export interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callState: CallData | null;
  callType: 'video' | 'voice';
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onEnd: () => Promise<void>;
}

export interface QuickTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickTexts: QuickText[];
  onSendQuickText: (textId: string) => Promise<void>;
}

