import { useState, useEffect, useCallback } from 'react';
import { logger } from '@awy/utils';
import type { WidgetService } from '../services/WidgetService';
import type { PresenceData } from '../types';

export interface UsePresenceReturn {
  /** Current user's online status */
  isOnline: boolean;
  /** Partner's presence data */
  partnerPresence: PresenceData | null;
  /** Update current user's presence */
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline', metadata?: Record<string, any>) => Promise<void>;
  /** Last presence update timestamp */
  lastUpdate: Date | null;
}

export function usePresence(
  widgetService: WidgetService | null,
  userId: string
): UsePresenceReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [partnerPresence, setPartnerPresence] = useState<PresenceData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Handle presence updates from WebSocket
  useEffect(() => {
    if (!widgetService) return;

    const handlePresenceUpdate = (data: PresenceData) => {
      // Only update if it's not our own presence
      if (data.userId !== userId) {
        setPartnerPresence(data);
        setLastUpdate(new Date());
        logger.debug('Partner presence updated:', data);
      }
    };

    const handleConnectionState = (state: any) => {
      setIsOnline(state.presence === 'connected');
    };

    const handleError = (error: { message: string }) => {
      logger.error('Presence error:', error.message);
    };

    widgetService.on('presence:update', handlePresenceUpdate);
    widgetService.on('connection:state', handleConnectionState);
    widgetService.on('error', handleError);

    return () => {
      widgetService.off('presence:update', handlePresenceUpdate);
      widgetService.off('connection:state', handleConnectionState);
      widgetService.off('error', handleError);
    };
  }, [widgetService, userId]);

  // Handle browser visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!widgetService) return;

      try {
        const status = document.hidden ? 'away' : 'online';
        await widgetService.updatePresence(status, {
          visibility: document.hidden ? 'hidden' : 'visible',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to update presence on visibility change:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [widgetService]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      if (!widgetService) return;
      
      try {
        await widgetService.updatePresence('online', {
          connection: 'restored',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to update presence on online event:', error);
      }
    };

    const handleOffline = async () => {
      if (!widgetService) return;
      
      try {
        await widgetService.updatePresence('offline', {
          connection: 'lost',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to update presence on offline event:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [widgetService]);

  // Update presence function
  const updatePresence = useCallback(async (
    status: 'online' | 'away' | 'busy' | 'offline',
    metadata?: Record<string, any>
  ) => {
    if (!widgetService) {
      throw new Error('Widget service not available');
    }

    try {
      await widgetService.updatePresence(status, {
        ...metadata,
        manual: true,
        timestamp: new Date().toISOString(),
      });
      setLastUpdate(new Date());
      logger.debug('Presence updated:', { status, metadata });
    } catch (error) {
      logger.error('Failed to update presence:', error);
      throw error;
    }
  }, [widgetService]);

  // Initialize presence on mount
  useEffect(() => {
    if (!widgetService) return;

    const initializePresence = async () => {
      try {
        await updatePresence('online', {
          initialized: true,
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch (error) {
        logger.error('Failed to initialize presence:', error);
      }
    };

    initializePresence();
  }, [widgetService, updatePresence]);

  return {
    isOnline,
    partnerPresence,
    updatePresence,
    lastUpdate,
  };
}

