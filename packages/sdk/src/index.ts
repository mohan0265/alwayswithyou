import { logger } from '@awy/utils';
import type { WidgetConfig } from '@awy/schema';

// SDK Types
export interface AWYConfig {
  /** Organization ID */
  orgId: string;
  /** API base URL */
  apiUrl: string;
  /** WebSocket base URL (optional, defaults to apiUrl with ws protocol) */
  wsUrl?: string;
  /** Widget configuration (optional, will be fetched if not provided) */
  config?: WidgetConfig;
  /** Debug mode */
  debug?: boolean;
}

export interface AWYUser {
  /** User ID */
  id: string;
  /** User type */
  type: 'student' | 'parent' | 'admin';
  /** Authentication token */
  token: string;
  /** User timezone (optional) */
  timezone?: string;
}

export interface AWYWidgetOptions {
  /** Container element or selector */
  container: string | HTMLElement;
  /** User information */
  user: AWYUser;
  /** Widget configuration */
  config: AWYConfig;
  /** Event callbacks */
  callbacks?: {
    onReady?: () => void;
    onError?: (error: string) => void;
    onCallIncoming?: (callData: any) => void;
    onMessage?: (message: any) => void;
    onPresenceChange?: (presence: any) => void;
  };
  /** Custom CSS class */
  className?: string;
  /** Custom styles */
  style?: Record<string, string>;
}

export interface AWYWidget {
  /** Start a video or voice call */
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
  updateSettings: (settings: any) => Promise<void>;
  /** Upload a memory */
  uploadMemory: (file: File, title?: string, caption?: string) => Promise<any>;
  /** Show/hide the widget */
  setVisible: (visible: boolean) => void;
  /** Get connection state */
  getConnectionState: () => any;
  /** Add event listener */
  on: (event: string, handler: Function) => void;
  /** Remove event listener */
  off: (event: string, handler: Function) => void;
  /** Destroy the widget */
  destroy: () => void;
}

// Global widget instances
const widgetInstances = new Map<string, AWYWidget>();

/**
 * Initialize the AWY widget
 */
export async function initAWY(options: AWYWidgetOptions): Promise<AWYWidget> {
  try {
    // Validate options
    if (!options.container) {
      throw new Error('Container is required');
    }
    if (!options.user?.id || !options.user?.token) {
      throw new Error('User ID and token are required');
    }
    if (!options.config?.orgId || !options.config?.apiUrl) {
      throw new Error('Organization ID and API URL are required');
    }

    // Enable debug logging if requested
    if (options.config.debug) {
      logger.setLevel('debug');
    }

    // Get container element
    const container = typeof options.container === 'string' 
      ? document.querySelector(options.container) as HTMLElement
      : options.container;

    if (!container) {
      throw new Error(`Container not found: ${options.container}`);
    }

    // Generate unique widget ID
    const widgetId = `awy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Load widget script if not already loaded
    await loadWidgetScript(options.config.apiUrl);

    // Initialize widget
    const widget = await createWidget(widgetId, container, options);

    // Store instance
    widgetInstances.set(widgetId, widget);

    logger.info('AWY widget initialized successfully:', widgetId);
    return widget;
  } catch (error) {
    logger.error('Failed to initialize AWY widget:', error);
    throw error;
  }
}

/**
 * Get all active widget instances
 */
export function getWidgetInstances(): AWYWidget[] {
  return Array.from(widgetInstances.values());
}

/**
 * Destroy all widget instances
 */
export function destroyAllWidgets(): void {
  widgetInstances.forEach(widget => widget.destroy());
  widgetInstances.clear();
}

/**
 * Load the widget script dynamically
 */
async function loadWidgetScript(apiUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.AWYWidget) {
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `${apiUrl}/static/awy-widget.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load AWY widget script'));

    // Add to document
    document.head.appendChild(script);
  });
}

/**
 * Create widget instance
 */
async function createWidget(
  widgetId: string,
  container: HTMLElement,
  options: AWYWidgetOptions
): Promise<AWYWidget> {
  // Determine WebSocket URL
  const wsUrl = options.config.wsUrl || options.config.apiUrl.replace(/^http/, 'ws');

  // Create widget props
  const widgetProps = {
    orgId: options.config.orgId,
    userId: options.user.id,
    apiUrl: options.config.apiUrl,
    wsUrl,
    authToken: options.user.token,
    onError: options.callbacks?.onError,
    onReady: options.callbacks?.onReady,
    className: options.className,
    style: options.style,
  };

  // Initialize widget using the loaded script
  const widgetInstance = (window as any).AWY.init(container, widgetProps);

  // Create SDK wrapper
  const widget: AWYWidget = {
    startCall: async (type: 'video' | 'voice') => {
      return widgetInstance.startCall(type);
    },

    sendMessage: async (content: string, type?: 'text' | 'quick_text') => {
      return widgetInstance.sendMessage(content, type);
    },

    updatePresence: async (status: 'online' | 'away' | 'busy' | 'offline', metadata?: Record<string, any>) => {
      return widgetInstance.updatePresence(status, metadata);
    },

    subscribeToPush: async () => {
      return widgetInstance.subscribeToPush();
    },

    unsubscribeFromPush: async () => {
      return widgetInstance.unsubscribeFromPush();
    },

    updateSettings: async (settings: any) => {
      return widgetInstance.updateSettings(settings);
    },

    uploadMemory: async (file: File, title?: string, caption?: string) => {
      return widgetInstance.uploadMemory(file, title, caption);
    },

    setVisible: (visible: boolean) => {
      const event = new CustomEvent('awy:setVisible', { detail: { visible } });
      container.dispatchEvent(event);
    },

    getConnectionState: () => {
      return widgetInstance.getConnectionState();
    },

    on: (event: string, handler: Function) => {
      widgetInstance.on(event, handler);
    },

    off: (event: string, handler: Function) => {
      widgetInstance.off(event, handler);
    },

    destroy: () => {
      widgetInstance.destroy();
      widgetInstances.delete(widgetId);
    },
  };

  // Set up event forwarding
  if (options.callbacks) {
    if (options.callbacks.onCallIncoming) {
      widget.on('call:incoming', options.callbacks.onCallIncoming);
    }
    if (options.callbacks.onMessage) {
      widget.on('chat:message', options.callbacks.onMessage);
    }
    if (options.callbacks.onPresenceChange) {
      widget.on('presence:update', options.callbacks.onPresenceChange);
    }
  }

  return widget;
}

/**
 * Simple one-line initialization for basic usage
 */
export function quickInit(
  container: string | HTMLElement,
  orgId: string,
  userId: string,
  userToken: string,
  apiUrl: string
): Promise<AWYWidget> {
  return initAWY({
    container,
    user: {
      id: userId,
      type: 'student', // Default to student
      token: userToken,
    },
    config: {
      orgId,
      apiUrl,
    },
  });
}

// Auto-initialization from script tag
document.addEventListener('DOMContentLoaded', () => {
  const scripts = document.querySelectorAll('script[data-awy-auto-init]');
  
  scripts.forEach(async (script) => {
    try {
      const container = script.getAttribute('data-container');
      const orgId = script.getAttribute('data-org-id');
      const userId = script.getAttribute('data-user-id');
      const userToken = script.getAttribute('data-user-token');
      const apiUrl = script.getAttribute('data-api-url');

      if (container && orgId && userId && userToken && apiUrl) {
        await quickInit(container, orgId, userId, userToken, apiUrl);
      }
    } catch (error) {
      logger.error('Failed to auto-initialize AWY widget:', error);
    }
  });
});

// Export types
export type { AWYConfig, AWYUser, AWYWidgetOptions, AWYWidget };

// Global API
if (typeof window !== 'undefined') {
  (window as any).AWY = {
    init: initAWY,
    quickInit,
    getInstances: getWidgetInstances,
    destroyAll: destroyAllWidgets,
  };
}

