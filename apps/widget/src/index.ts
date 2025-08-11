import React from 'react';
import { createRoot } from 'react-dom/client';
import { AWYWidget } from './components/AWYWidget';
import type { AWYWidgetProps, WidgetAPI } from './types';
import { logger } from '@awy/utils';
import './styles/widget.css';

// Global widget instances
const widgetInstances = new Map<string, WidgetAPI>();

/**
 * Initialize and mount the AWY widget
 */
export function initAWYWidget(
  container: string | HTMLElement,
  props: AWYWidgetProps
): WidgetAPI {
  try {
    // Get container element
    const element = typeof container === 'string' 
      ? document.querySelector(container) as HTMLElement
      : container;

    if (!element) {
      throw new Error(`AWY Widget container not found: ${container}`);
    }

    // Generate unique instance ID
    const instanceId = `awy-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create widget root
    const widgetRoot = document.createElement('div');
    widgetRoot.id = instanceId;
    widgetRoot.className = 'awy-widget-root';
    element.appendChild(widgetRoot);

    // Create React root and render widget
    const root = createRoot(widgetRoot);
    root.render(React.createElement(AWYWidget, props));

    // Create widget API
    const api: WidgetAPI = {
      startCall: async (type: 'video' | 'voice') => {
        const event = new CustomEvent('awy:startCall', { detail: { type } });
        widgetRoot.dispatchEvent(event);
      },

      sendMessage: async (content: string, type?: 'text' | 'quick_text') => {
        const event = new CustomEvent('awy:sendMessage', { detail: { content, type } });
        widgetRoot.dispatchEvent(event);
      },

      updatePresence: async (status: 'online' | 'away' | 'busy' | 'offline', metadata?: Record<string, any>) => {
        const event = new CustomEvent('awy:updatePresence', { detail: { status, metadata } });
        widgetRoot.dispatchEvent(event);
      },

      subscribeToPush: async () => {
        return new Promise((resolve) => {
          const handler = (event: any) => {
            widgetRoot.removeEventListener('awy:pushSubscribed', handler);
            resolve(event.detail.success);
          };
          widgetRoot.addEventListener('awy:pushSubscribed', handler);
          
          const event = new CustomEvent('awy:subscribeToPush');
          widgetRoot.dispatchEvent(event);
        });
      },

      unsubscribeFromPush: async () => {
        return new Promise((resolve) => {
          const handler = (event: any) => {
            widgetRoot.removeEventListener('awy:pushUnsubscribed', handler);
            resolve(event.detail.success);
          };
          widgetRoot.addEventListener('awy:pushUnsubscribed', handler);
          
          const event = new CustomEvent('awy:unsubscribeFromPush');
          widgetRoot.dispatchEvent(event);
        });
      },

      updateSettings: async (settings) => {
        const event = new CustomEvent('awy:updateSettings', { detail: { settings } });
        widgetRoot.dispatchEvent(event);
      },

      uploadMemory: async (file: File, title?: string, caption?: string) => {
        return new Promise((resolve, reject) => {
          const handler = (event: any) => {
            widgetRoot.removeEventListener('awy:memoryUploaded', handler);
            if (event.detail.success) {
              resolve(event.detail.memory);
            } else {
              reject(new Error(event.detail.error));
            }
          };
          widgetRoot.addEventListener('awy:memoryUploaded', handler);
          
          const event = new CustomEvent('awy:uploadMemory', { detail: { file, title, caption } });
          widgetRoot.dispatchEvent(event);
        });
      },

      getConnectionState: () => {
        // This would need to be implemented with a synchronous state getter
        return {
          presence: 'connected',
          chat: 'connected',
          signaling: 'connected',
        };
      },

      on: (event, handler) => {
        const eventName = `awy:${event}`;
        widgetRoot.addEventListener(eventName, handler as EventListener);
      },

      off: (event, handler) => {
        const eventName = `awy:${event}`;
        widgetRoot.removeEventListener(eventName, handler as EventListener);
      },

      destroy: () => {
        try {
          root.unmount();
          element.removeChild(widgetRoot);
          widgetInstances.delete(instanceId);
          logger.info('AWY Widget destroyed:', instanceId);
        } catch (error) {
          logger.error('Error destroying AWY Widget:', error);
        }
      },
    };

    // Store instance
    widgetInstances.set(instanceId, api);

    logger.info('AWY Widget initialized:', instanceId);
    return api;
  } catch (error) {
    logger.error('Failed to initialize AWY Widget:', error);
    throw error;
  }
}

/**
 * Get all active widget instances
 */
export function getWidgetInstances(): Map<string, WidgetAPI> {
  return new Map(widgetInstances);
}

/**
 * Destroy all widget instances
 */
export function destroyAllWidgets(): void {
  widgetInstances.forEach(api => api.destroy());
  widgetInstances.clear();
}

// Auto-initialize from script tag data attributes
document.addEventListener('DOMContentLoaded', () => {
  const scripts = document.querySelectorAll('script[data-awy-widget]');
  
  scripts.forEach(script => {
    try {
      const container = script.getAttribute('data-container');
      const orgId = script.getAttribute('data-org-id');
      const userId = script.getAttribute('data-user-id');
      const apiUrl = script.getAttribute('data-api-url');
      const wsUrl = script.getAttribute('data-ws-url');
      const authToken = script.getAttribute('data-auth-token');

      if (container && orgId && userId && apiUrl && wsUrl && authToken) {
        initAWYWidget(container, {
          orgId,
          userId,
          apiUrl,
          wsUrl,
          authToken,
        });
      }
    } catch (error) {
      logger.error('Failed to auto-initialize widget from script tag:', error);
    }
  });
});

// Export types and components for advanced usage
export type { AWYWidgetProps, WidgetAPI } from './types';
export { AWYWidget } from './components/AWYWidget';

// Global API for browser usage
if (typeof window !== 'undefined') {
  (window as any).AWY = {
    init: initAWYWidget,
    getInstances: getWidgetInstances,
    destroyAll: destroyAllWidgets,
  };
}

