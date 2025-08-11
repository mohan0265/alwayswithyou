import { useState, useEffect, useCallback } from 'react';
import { logger } from '@awy/utils';
import type { WidgetService } from '../services/WidgetService';
import type { NotificationPayload } from '../types';

export interface UsePushNotificationsReturn {
  /** Whether push notifications are supported */
  isSupported: boolean;
  /** Whether user is subscribed to push notifications */
  isSubscribed: boolean;
  /** Current permission state */
  permission: NotificationPermission;
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Request notification permission */
  requestPermission: () => Promise<NotificationPermission>;
  /** Show local notification */
  showNotification: (payload: NotificationPayload) => Promise<void>;
}

export function usePushNotifications(
  widgetService: WidgetService | null
): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check support and initial state
  useEffect(() => {
    const checkSupport = async () => {
      // Check if service workers and push messaging are supported
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        // Get current permission
        setPermission(Notification.permission);
        
        // Check if already subscribed
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          logger.error('Failed to check push subscription:', error);
        }
      }
    };

    checkSupport();
  }, []);

  // Handle incoming notifications
  useEffect(() => {
    if (!widgetService) return;

    const handleNotification = (payload: NotificationPayload) => {
      // Show notification if permission is granted and page is not visible
      if (permission === 'granted' && document.hidden) {
        showNotification(payload).catch(error => {
          logger.error('Failed to show notification:', error);
        });
      }
    };

    widgetService.on('notification:received', handleNotification);

    return () => {
      widgetService.off('notification:received', handleNotification);
    };
  }, [widgetService, permission]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      logger.debug('Notification permission:', result);
      return result;
    } catch (error) {
      logger.error('Failed to request notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !widgetService) {
      throw new Error('Push notifications are not supported or service not available');
    }

    try {
      // Request permission if not already granted
      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        logger.warn('Notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const configResponse = await fetch(`${widgetService['config'].apiUrl}/v1/config/${widgetService['config'].orgId}/vapid`);
      if (!configResponse.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const configData = await configResponse.json();
      const publicKey = configData.data.publicKey;

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Register subscription with server
      const registerResponse = await fetch(`${widgetService['config'].apiUrl}/v1/notify/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${widgetService['config'].authToken}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register push subscription');
      }

      setIsSubscribed(true);
      logger.info('Push notifications subscribed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }, [isSupported, widgetService, permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !widgetService) {
      throw new Error('Push notifications are not supported or service not available');
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Unregister from server
        const unregisterResponse = await fetch(`${widgetService['config'].apiUrl}/v1/notify/unregister`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${widgetService['config'].authToken}`,
          },
        });

        if (!unregisterResponse.ok) {
          logger.warn('Failed to unregister from server, but local unsubscribe succeeded');
        }
      }

      setIsSubscribed(false);
      logger.info('Push notifications unsubscribed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }, [isSupported, widgetService]);

  // Show local notification
  const showNotification = useCallback(async (payload: NotificationPayload): Promise<void> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      // Use service worker to show notification if available
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          badge: payload.badge || '/badge-72x72.png',
          tag: payload.tag || 'awy-notification',
          data: payload.data,
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open',
              icon: '/icon-open.png',
            },
            {
              action: 'close',
              title: 'Close',
              icon: '/icon-close.png',
            },
          ],
        });
      } else {
        // Fallback to regular notification
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          tag: payload.tag || 'awy-notification',
          data: payload.data,
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      logger.debug('Notification shown:', payload.title);
    } catch (error) {
      logger.error('Failed to show notification:', error);
      throw error;
    }
  }, [isSupported, permission]);

  // Handle notification clicks
  useEffect(() => {
    if (!isSupported) return;

    const handleNotificationClick = (event: Event) => {
      const notificationEvent = event as any;
      const action = notificationEvent.action;
      const notification = notificationEvent.notification;

      notification.close();

      if (action === 'open' || !action) {
        // Focus or open the app
        if (window.parent !== window) {
          window.parent.focus();
        } else {
          window.focus();
        }
      }

      logger.debug('Notification clicked:', { action, data: notification.data });
    };

    // Listen for notification clicks via service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'notification-click') {
        handleNotificationClick(event);
      }
    });

    return () => {
      // Cleanup is handled by service worker
    };
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
    showNotification,
  };
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

