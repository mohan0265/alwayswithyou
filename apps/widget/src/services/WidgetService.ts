import { logger } from '@awy/utils';
import type { 
  WidgetServiceConfig, 
  WidgetEvents, 
  WidgetEventHandler,
  ConnectionState,
  PresenceData,
  ChatMessage,
  CallData,
  Memory,
  UserSettings,
  WebSocketMessage
} from '../types';
import type { WidgetConfig } from '@awy/schema';

export class WidgetService {
  private config: WidgetServiceConfig;
  private eventHandlers: Map<keyof WidgetEvents, Set<WidgetEventHandler<any>>> = new Map();
  private websockets: {
    presence?: WebSocket;
    chat?: WebSocket;
    signaling?: WebSocket;
  } = {};
  private connectionState: ConnectionState = {
    presence: 'disconnected',
    chat: 'disconnected',
    signaling: 'disconnected',
  };
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: WidgetServiceConfig) {
    this.config = config;
  }

  // Event handling
  on<T extends keyof WidgetEvents>(event: T, handler: WidgetEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off<T extends keyof WidgetEvents>(event: T, handler: WidgetEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit<T extends keyof WidgetEvents>(event: T, data: WidgetEvents[T]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Configuration
  async loadConfig(): Promise<WidgetConfig> {
    try {
      const response = await this.fetch(`/v1/config/${this.config.orgId}`);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Failed to load widget config:', error);
      throw error;
    }
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.connectPresence(),
        this.connectChat(),
        this.connectSignaling(),
      ]);

      // Start heartbeat
      this.startHeartbeat();

      logger.info('Widget service connected');
    } catch (error) {
      logger.error('Failed to connect widget service:', error);
      throw error;
    }
  }

  disconnect(): void {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Clear reconnect timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();

    // Close WebSocket connections
    Object.values(this.websockets).forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    this.websockets = {};
    this.connectionState = {
      presence: 'disconnected',
      chat: 'disconnected',
      signaling: 'disconnected',
    };

    this.emit('connection:state', this.connectionState);
    logger.info('Widget service disconnected');
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Presence WebSocket
  private async connectPresence(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl('/ws/presence');
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          this.connectionState.presence = 'connected';
          this.emit('connection:state', this.connectionState);
          logger.debug('Presence WebSocket connected');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handlePresenceMessage(message);
          } catch (error) {
            logger.error('Failed to parse presence message:', error);
          }
        };

        ws.onclose = () => {
          this.connectionState.presence = 'disconnected';
          this.emit('connection:state', this.connectionState);
          logger.debug('Presence WebSocket disconnected');
          this.scheduleReconnect('presence', () => this.connectPresence());
        };

        ws.onerror = (error) => {
          logger.error('Presence WebSocket error:', error);
          reject(error);
        };

        this.websockets.presence = ws;
        this.connectionState.presence = 'connecting';
        this.emit('connection:state', this.connectionState);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Chat WebSocket
  private async connectChat(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl('/ws/chat');
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          this.connectionState.chat = 'connected';
          this.emit('connection:state', this.connectionState);
          logger.debug('Chat WebSocket connected');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleChatMessage(message);
          } catch (error) {
            logger.error('Failed to parse chat message:', error);
          }
        };

        ws.onclose = () => {
          this.connectionState.chat = 'disconnected';
          this.emit('connection:state', this.connectionState);
          logger.debug('Chat WebSocket disconnected');
          this.scheduleReconnect('chat', () => this.connectChat());
        };

        ws.onerror = (error) => {
          logger.error('Chat WebSocket error:', error);
          reject(error);
        };

        this.websockets.chat = ws;
        this.connectionState.chat = 'connecting';
        this.emit('connection:state', this.connectionState);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Signaling WebSocket
  private async connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl('/ws/signaling');
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          this.connectionState.signaling = 'connected';
          this.emit('connection:state', this.connectionState);
          logger.debug('Signaling WebSocket connected');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleSignalingMessage(message);
          } catch (error) {
            logger.error('Failed to parse signaling message:', error);
          }
        };

        ws.onclose = () => {
          this.connectionState.signaling = 'disconnected';
          this.emit('connection:state', this.connectionState);
          logger.debug('Signaling WebSocket disconnected');
          this.scheduleReconnect('signaling', () => this.connectSignaling());
        };

        ws.onerror = (error) => {
          logger.error('Signaling WebSocket error:', error);
          reject(error);
        };

        this.websockets.signaling = ws;
        this.connectionState.signaling = 'connecting';
        this.emit('connection:state', this.connectionState);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Message handlers
  private handlePresenceMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'partner_presence_update':
        this.emit('presence:update', message.data as PresenceData);
        break;
      case 'heartbeat_ack':
        // Handle heartbeat acknowledgment
        break;
      case 'error':
        this.emit('error', { message: message.data.message });
        break;
      default:
        logger.debug('Unknown presence message type:', message.type);
    }
  }

  private handleChatMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'message_received':
        this.emit('chat:message', message.data.message as ChatMessage);
        break;
      case 'typing_indicator':
        this.emit('chat:typing', {
          userId: message.data.userId,
          isTyping: message.data.isTyping,
        });
        break;
      case 'error':
        this.emit('error', { message: message.data.message });
        break;
      default:
        logger.debug('Unknown chat message type:', message.type);
    }
  }

  private handleSignalingMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'call_offer_received':
        this.emit('call:incoming', message.data as CallData);
        break;
      case 'call_ended':
        this.emit('call:ended', message.data as CallData);
        break;
      case 'error':
        this.emit('error', { message: message.data.message });
        break;
      default:
        logger.debug('Unknown signaling message type:', message.type);
    }
  }

  // API methods
  async sendMessage(content: string, type: 'text' | 'quick_text' = 'text'): Promise<void> {
    if (!this.websockets.chat || this.websockets.chat.readyState !== WebSocket.OPEN) {
      throw new Error('Chat connection not available');
    }

    const message = {
      id: this.generateId(),
      type: 'message',
      namespace: 'chat',
      data: {
        senderId: this.config.userId,
        content,
        messageType: type,
      },
      timestamp: new Date().toISOString(),
    };

    this.websockets.chat.send(JSON.stringify(message));
  }

  async updatePresence(status: 'online' | 'away' | 'busy' | 'offline', metadata?: Record<string, any>): Promise<void> {
    if (!this.websockets.presence || this.websockets.presence.readyState !== WebSocket.OPEN) {
      throw new Error('Presence connection not available');
    }

    const message = {
      id: this.generateId(),
      type: 'presence_update',
      namespace: 'presence',
      data: {
        userId: this.config.userId,
        status,
        metadata,
      },
      timestamp: new Date().toISOString(),
    };

    this.websockets.presence.send(JSON.stringify(message));
  }

  async startCall(type: 'video' | 'voice'): Promise<void> {
    // Implementation would depend on WebRTC setup
    // For now, we'll emit a placeholder event
    this.emit('call:incoming', {
      id: this.generateId(),
      type,
      status: 'initiating',
      participants: {
        caller: this.config.userId,
        callee: 'partner', // Would be actual partner ID
      },
      startedAt: new Date().toISOString(),
    });
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const response = await this.fetch('/v1/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to update settings:', error);
      throw error;
    }
  }

  async uploadMemory(file: File, title?: string, caption?: string): Promise<Memory> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      if (caption) formData.append('caption', caption);

      const response = await this.fetch('/v1/memories/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload memory: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error('Failed to upload memory:', error);
      throw error;
    }
  }

  // Utility methods
  private buildWebSocketUrl(path: string): string {
    const url = new URL(path, this.config.wsUrl.replace('http', 'ws'));
    url.searchParams.set('token', this.config.authToken);
    return url.toString();
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = new URL(path, this.config.apiUrl);
    
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.config.authToken}`);
    
    return fetch(url.toString(), {
      ...options,
      headers,
    });
  }

  private scheduleReconnect(type: string, reconnectFn: () => Promise<void>): void {
    const timeout = this.reconnectTimeouts.get(type);
    if (timeout) {
      clearTimeout(timeout);
    }

    const newTimeout = setTimeout(async () => {
      try {
        await reconnectFn();
        this.reconnectTimeouts.delete(type);
      } catch (error) {
        logger.error(`Failed to reconnect ${type}:`, error);
        // Schedule another reconnect with exponential backoff
        this.scheduleReconnect(type, reconnectFn);
      }
    }, 5000); // 5 second delay

    this.reconnectTimeouts.set(type, newTimeout);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.websockets.presence && this.websockets.presence.readyState === WebSocket.OPEN) {
        const heartbeat = {
          id: this.generateId(),
          type: 'heartbeat',
          namespace: 'presence',
          data: {
            status: 'online',
          },
          timestamp: new Date().toISOString(),
        };
        this.websockets.presence.send(JSON.stringify(heartbeat));
      }
    }, 30000); // 30 seconds
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

