import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@awy/utils';
import type { WidgetService } from '../services/WidgetService';
import type { ChatMessage } from '../types';

export interface UseChatReturn {
  /** Array of chat messages */
  messages: ChatMessage[];
  /** Whether partner is currently typing */
  isTyping: boolean;
  /** Send a message */
  sendMessage: (content: string, type?: 'text' | 'quick_text') => Promise<void>;
  /** Mark a message as read */
  markAsRead: (messageId: string) => Promise<void>;
  /** Set typing indicator */
  setTyping: (isTyping: boolean) => void;
  /** Clear all messages */
  clearMessages: () => void;
  /** Get unread message count */
  unreadCount: number;
}

export function useChat(
  widgetService: WidgetService | null,
  userId: string
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingStateRef = useRef(false);

  // Handle incoming messages
  useEffect(() => {
    if (!widgetService) return;

    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists (prevent duplicates)
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;

        // Add message and sort by timestamp
        const newMessages = [...prev, message].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Keep only last 100 messages for performance
        return newMessages.slice(-100);
      });

      logger.debug('Message received:', message);
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      // Only show typing indicator for other users
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
        
        // Clear typing indicator after 3 seconds if no update
        if (data.isTyping) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      }
    };

    const handleError = (error: { message: string }) => {
      logger.error('Chat error:', error.message);
    };

    widgetService.on('chat:message', handleMessage);
    widgetService.on('chat:typing', handleTyping);
    widgetService.on('error', handleError);

    return () => {
      widgetService.off('chat:message', handleMessage);
      widgetService.off('chat:typing', handleTyping);
      widgetService.off('error', handleError);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [widgetService, userId]);

  // Send message function
  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'quick_text' = 'text'
  ) => {
    if (!widgetService) {
      throw new Error('Widget service not available');
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    try {
      // Clear typing indicator when sending
      if (lastTypingStateRef.current) {
        setTyping(false);
      }

      await widgetService.sendMessage(content.trim(), type);
      logger.debug('Message sent:', { content, type });
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }, [widgetService]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!widgetService) {
      throw new Error('Widget service not available');
    }

    try {
      // Update local state optimistically
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, readAt: new Date().toISOString() }
            : msg
        )
      );

      // TODO: Send read receipt to server
      // await widgetService.markAsRead(messageId);
      
      logger.debug('Message marked as read:', messageId);
    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      
      // Revert optimistic update on error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, readAt: undefined }
            : msg
        )
      );
      
      throw error;
    }
  }, [widgetService]);

  // Set typing indicator
  const setTyping = useCallback((typing: boolean) => {
    if (!widgetService) return;

    // Only send if state actually changed
    if (lastTypingStateRef.current === typing) return;

    lastTypingStateRef.current = typing;

    try {
      // TODO: Send typing indicator to server via WebSocket
      // For now, we'll just log it
      logger.debug('Typing indicator:', typing);
    } catch (error) {
      logger.error('Failed to set typing indicator:', error);
    }
  }, [widgetService]);

  // Clear messages function
  const clearMessages = useCallback(() => {
    setMessages([]);
    logger.debug('Messages cleared');
  }, []);

  // Calculate unread count
  const unreadCount = messages.filter(
    msg => !msg.readAt && msg.senderId !== userId
  ).length;

  // Auto-mark messages as read when they come into view
  useEffect(() => {
    const unreadMessages = messages.filter(
      msg => !msg.readAt && msg.senderId !== userId
    );

    // Auto-mark recent messages as read after a short delay
    if (unreadMessages.length > 0) {
      const timeout = setTimeout(() => {
        unreadMessages.forEach(msg => {
          markAsRead(msg.id).catch(error => {
            logger.error('Failed to auto-mark message as read:', error);
          });
        });
      }, 1000); // 1 second delay

      return () => clearTimeout(timeout);
    }
  }, [messages, userId, markAsRead]);

  // Load initial messages on mount
  useEffect(() => {
    if (!widgetService) return;

    const loadInitialMessages = async () => {
      try {
        // TODO: Load recent messages from API
        // const recentMessages = await widgetService.getRecentMessages();
        // setMessages(recentMessages);
        logger.debug('Initial messages loaded');
      } catch (error) {
        logger.error('Failed to load initial messages:', error);
      }
    };

    loadInitialMessages();
  }, [widgetService]);

  return {
    messages,
    isTyping,
    sendMessage,
    markAsRead,
    setTyping,
    clearMessages,
    unreadCount,
  };
}

