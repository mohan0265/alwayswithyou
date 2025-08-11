import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartButton, Toast, Modal, Tabs } from '@awy/ui';
import { WidgetConfigSchema, type WidgetConfig } from '@awy/schema';
import { logger } from '@awy/utils';
import { WidgetService } from '../services/WidgetService';
import { usePresence } from '../hooks/usePresence';
import { useChat } from '../hooks/useChat';
import { useWebRTC } from '../hooks/useWebRTC';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { HomePanel } from './panels/HomePanel';
import { ChatPanel } from './panels/ChatPanel';
import { MemoriesPanel } from './panels/MemoriesPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { CallModal } from './modals/CallModal';
import { QuickTextModal } from './modals/QuickTextModal';
import type { AWYWidgetProps, WidgetState } from '../types';

export const AWYWidget: React.FC<AWYWidgetProps> = ({
  orgId,
  userId,
  apiUrl,
  wsUrl,
  authToken,
  onError,
  onReady,
  className,
  style,
}) => {
  // Widget state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'memories' | 'settings'>('home');
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCallModal, setShowCallModal] = useState(false);
  const [showQuickTextModal, setShowQuickTextModal] = useState(false);
  const [callType, setCallType] = useState<'video' | 'voice'>('video');

  // Services
  const widgetService = useRef<WidgetService | null>(null);

  // Custom hooks
  const { 
    isOnline: selfOnline, 
    partnerPresence, 
    updatePresence 
  } = usePresence(widgetService.current, userId);

  const {
    messages,
    isTyping,
    sendMessage,
    markAsRead,
    setTyping
  } = useChat(widgetService.current, userId);

  const {
    isInCall,
    callState,
    startCall,
    endCall,
    acceptCall,
    rejectCall
  } = useWebRTC(widgetService.current);

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush
  } = usePushNotifications(widgetService.current);

  // Initialize widget
  useEffect(() => {
    const initWidget = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize widget service
        widgetService.current = new WidgetService({
          orgId,
          userId,
          apiUrl,
          wsUrl,
          authToken,
        });

        // Load configuration
        const configData = await widgetService.current.loadConfig();
        const validatedConfig = WidgetConfigSchema.parse(configData);
        setConfig(validatedConfig);

        // Connect to real-time services
        await widgetService.current.connect();

        // Register service worker for push notifications
        if ('serviceWorker' in navigator && pushSupported) {
          try {
            await navigator.serviceWorker.register('/awy-sw.js');
          } catch (swError) {
            logger.warn('Service worker registration failed:', swError);
          }
        }

        setIsLoading(false);
        onReady?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize widget';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
        logger.error('Widget initialization failed:', err);
      }
    };

    initWidget();

    // Cleanup on unmount
    return () => {
      widgetService.current?.disconnect();
    };
  }, [orgId, userId, apiUrl, wsUrl, authToken, onError, onReady, pushSupported]);

  // Handle widget open/close persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`awy_widget_open_${userId}`);
      if (saved !== null) {
        setIsOpen(JSON.parse(saved));
      }
    } catch (error) {
      logger.warn('Failed to load widget state from localStorage:', error);
    }
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(`awy_widget_open_${userId}`, JSON.stringify(isOpen));
    } catch (error) {
      logger.warn('Failed to save widget state to localStorage:', error);
    }
  }, [isOpen, userId]);

  // Handle incoming calls
  useEffect(() => {
    if (callState?.status === 'incoming') {
      setShowCallModal(true);
      setCallType(callState.type);
    }
  }, [callState]);

  // Heart button click handler
  const handleHeartClick = useCallback(() => {
    setIsOpen(prev => !prev);
    
    // Send heartbeat to partner
    if (partnerPresence?.status === 'online') {
      updatePresence('online', { heartbeat: true });
    }
  }, [partnerPresence, updatePresence]);

  // Quick text handler
  const handleQuickText = useCallback(async (textId: string) => {
    if (!config?.quickTexts) return;
    
    const quickText = config.quickTexts.find(qt => qt.id === textId);
    if (!quickText) return;

    try {
      await sendMessage(quickText.text, 'quick_text');
      setShowQuickTextModal(false);
    } catch (error) {
      logger.error('Failed to send quick text:', error);
    }
  }, [config, sendMessage]);

  // Call handlers
  const handleStartCall = useCallback(async (type: 'video' | 'voice') => {
    try {
      await startCall(type);
      setShowCallModal(true);
      setCallType(type);
    } catch (error) {
      logger.error('Failed to start call:', error);
    }
  }, [startCall]);

  const handleAcceptCall = useCallback(async () => {
    try {
      await acceptCall();
      setShowCallModal(false);
    } catch (error) {
      logger.error('Failed to accept call:', error);
    }
  }, [acceptCall]);

  const handleRejectCall = useCallback(async () => {
    try {
      await rejectCall();
      setShowCallModal(false);
    } catch (error) {
      logger.error('Failed to reject call:', error);
    }
  }, [rejectCall]);

  const handleEndCall = useCallback(async () => {
    try {
      await endCall();
      setShowCallModal(false);
    } catch (error) {
      logger.error('Failed to end call:', error);
    }
  }, [endCall]);

  // Determine heart button state
  const getHeartState = useCallback(() => {
    if (!selfOnline) return 'offline';
    if (partnerPresence?.status === 'online') return 'online';
    if (partnerPresence?.status === 'away') return 'away';
    return 'waiting';
  }, [selfOnline, partnerPresence]);

  // Tab configuration
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      content: (
        <HomePanel
          config={config}
          partnerPresence={partnerPresence}
          onStartCall={handleStartCall}
          onQuickText={() => setShowQuickTextModal(true)}
          isInCall={isInCall}
        />
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      badge: messages.filter(m => !m.readAt && m.senderId !== userId).length || undefined,
      content: (
        <ChatPanel
          messages={messages}
          currentUserId={userId}
          isTyping={isTyping}
          onSendMessage={sendMessage}
          onMarkAsRead={markAsRead}
          onSetTyping={setTyping}
        />
      ),
    },
    {
      id: 'memories',
      label: 'Memories',
      icon: '📸',
      content: (
        <MemoriesPanel
          widgetService={widgetService.current}
        />
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      content: (
        <SettingsPanel
          config={config}
          widgetService={widgetService.current}
          pushSupported={pushSupported}
          pushSubscribed={pushSubscribed}
          onSubscribeToPush={subscribeToPush}
          onUnsubscribeFromPush={unsubscribeFromPush}
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className={`awy-widget awy-widget--loading ${className || ''}`} style={style}>
        <div className="fixed bottom-4 right-4 z-[999999]">
          <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`awy-widget awy-widget--error ${className || ''}`} style={style}>
        <div className="fixed bottom-4 right-4 z-[999999]">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
        </div>
        <Toast
          type="error"
          message={`AWY Widget Error: ${error}`}
          duration={10000}
        />
      </div>
    );
  }

  return (
    <div className={`awy-widget ${className || ''}`} style={style}>
      {/* Floating Heart Button */}
      <div className="fixed bottom-4 right-4 z-[999999]">
        <HeartButton
          state={getHeartState()}
          onClick={handleHeartClick}
          size="large"
          showPulse={partnerPresence?.status === 'online'}
          disabled={!selfOnline}
        />
      </div>

      {/* Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 right-4 z-[999998] w-96 max-w-[calc(100vw-2rem)] h-[32rem] bg-white rounded-2xl shadow-floating border border-gray-200 overflow-hidden"
            role="dialog"
            aria-label="Always With You Widget"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-awy-primary to-awy-secondary">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">💖</span>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Always With You</h2>
                  <p className="text-white/80 text-xs">
                    {partnerPresence?.status === 'online' ? 'Partner is online' : 'Partner is offline'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label="Close widget"
              >
                ✕
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                variant="pills"
                size="sm"
                className="h-full"
                animateContent={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Modal */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        callState={callState}
        callType={callType}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
      />

      {/* Quick Text Modal */}
      <QuickTextModal
        isOpen={showQuickTextModal}
        onClose={() => setShowQuickTextModal(false)}
        quickTexts={config?.quickTexts || []}
        onSendQuickText={handleQuickText}
      />
    </div>
  );
};

