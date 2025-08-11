import { FastifyInstance } from 'fastify';
import { logger } from '@awy/utils';
import { 
  ChatMessageSchema, 
  TypingIndicatorMessageSchema,
  ReadReceiptMessageSchema,
  WSMessageSchema 
} from '@awy/schema';
import type { WebSocketConnection } from './index.js';
import type { ConnectionManager } from './index.js';
import { v4 as uuidv4 } from 'uuid';

export async function chatHandler(
  connection: WebSocketConnection,
  connectionManager: ConnectionManager,
  fastify: FastifyInstance
) {
  const { socket, userId, orgId } = connection;

  // Send initial chat state
  const initialState = await getChatState(userId, fastify);
  socket.send(JSON.stringify({
    id: generateMessageId(),
    type: 'chat_state',
    namespace: 'chat',
    data: initialState,
    timestamp: new Date(),
  }));

  // Handle incoming messages
  socket.on('message', async (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());
      const validatedMessage = WSMessageSchema.parse(message);

      // Update heartbeat
      connection.lastHeartbeat = new Date();

      switch (validatedMessage.type) {
        case 'message':
          await handleChatMessage(connection, validatedMessage, fastify, connectionManager);
          break;
        
        case 'typing':
          await handleTypingIndicator(connection, validatedMessage, fastify, connectionManager);
          break;

        case 'read_receipt':
          await handleReadReceipt(connection, validatedMessage, fastify, connectionManager);
          break;

        default:
          logger.warn('Unknown chat message type:', validatedMessage.type);
      }
    } catch (error) {
      logger.error('Error handling chat message:', error);
      socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'error',
        namespace: 'chat',
        data: {
          error: 'Invalid message format',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      }));
    }
  });

  // Handle disconnection
  socket.on('close', async () => {
    try {
      connectionManager.removeConnection(connection.id);
      
      // Clear typing indicators for this user
      await clearTypingIndicators(userId, fastify, connectionManager);
      
      logger.debug('Chat connection closed', { userId, connectionId: connection.id });
    } catch (error) {
      logger.error('Error handling chat disconnection:', error);
    }
  });

  socket.on('error', (error) => {
    logger.error('Chat WebSocket error:', error);
    connectionManager.removeConnection(connection.id);
  });
}

async function handleChatMessage(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const chatMessage = ChatMessageSchema.parse(message);
    
    // Verify user can send messages to this pairing
    const canSendMessage = await fastify.authService.hasPermission(
      connection.userId, 
      'send_message', 
      chatMessage.data.pairingId
    );

    if (!canSendMessage) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'error',
        namespace: 'chat',
        data: {
          error: 'Forbidden',
          message: 'You cannot send messages to this pairing',
        },
        timestamp: new Date(),
      }));
      return;
    }

    // Save message to database
    const messageId = uuidv4();
    const { data: savedMessage, error } = await fastify.supabase
      .from('messages')
      .insert({
        id: messageId,
        pairing_id: chatMessage.data.pairingId,
        sender_id: chatMessage.data.senderId,
        content: chatMessage.data.content,
        message_type: chatMessage.data.messageType,
        created_at: new Date().toISOString(),
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error('Error saving chat message:', error);
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'error',
        namespace: 'chat',
        data: {
          error: 'Failed to send message',
          message: 'Could not save message to database',
        },
        timestamp: new Date(),
      }));
      return;
    }

    // Get pairing details to find recipient
    const { data: pairing } = await fastify.supabase
      .from('pairings')
      .select('student_id, parent_id')
      .eq('id', chatMessage.data.pairingId)
      .single();

    if (pairing) {
      const recipientId = pairing.student_id === connection.userId 
        ? pairing.parent_id 
        : pairing.student_id;

      // Broadcast message to recipient
      const messagePayload = {
        id: generateMessageId(),
        type: 'message_received',
        namespace: 'chat',
        data: {
          message: savedMessage,
          pairingId: chatMessage.data.pairingId,
        },
        timestamp: new Date(),
      };

      connectionManager.broadcastToUser(recipientId, messagePayload);

      // Send confirmation to sender
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'message_sent',
        namespace: 'chat',
        data: {
          message: savedMessage,
          tempId: chatMessage.id, // For optimistic updates
        },
        timestamp: new Date(),
      }));

      // Clear typing indicator
      await clearTypingIndicator(connection.userId, chatMessage.data.pairingId, fastify, connectionManager);

      // Send push notification if recipient is offline
      await sendPushNotificationIfOffline(recipientId, savedMessage, fastify);
    }

    logger.debug('Chat message sent', {
      messageId,
      senderId: connection.userId,
      pairingId: chatMessage.data.pairingId,
    });
  } catch (error) {
    logger.error('Error handling chat message:', error);
  }
}

async function handleTypingIndicator(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const typingMessage = TypingIndicatorMessageSchema.parse(message);
    
    // Get pairing details
    const { data: pairing } = await fastify.supabase
      .from('pairings')
      .select('student_id, parent_id')
      .eq('id', typingMessage.data.pairingId)
      .single();

    if (pairing) {
      const recipientId = pairing.student_id === connection.userId 
        ? pairing.parent_id 
        : pairing.student_id;

      // Broadcast typing indicator to recipient
      connectionManager.broadcastToUser(recipientId, {
        id: generateMessageId(),
        type: 'typing_indicator',
        namespace: 'chat',
        data: {
          userId: typingMessage.data.userId,
          pairingId: typingMessage.data.pairingId,
          isTyping: typingMessage.data.isTyping,
        },
        timestamp: new Date(),
      });
    }
  } catch (error) {
    logger.error('Error handling typing indicator:', error);
  }
}

async function handleReadReceipt(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const readReceiptMessage = ReadReceiptMessageSchema.parse(message);
    
    // Update message read status
    const { error } = await fastify.supabase
      .from('messages')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('id', readReceiptMessage.data.messageId);

    if (error) {
      logger.error('Error updating read receipt:', error);
      return;
    }

    // Get message details to find sender
    const { data: messageData } = await fastify.supabase
      .from('messages')
      .select('sender_id, pairing_id')
      .eq('id', readReceiptMessage.data.messageId)
      .single();

    if (messageData && messageData.sender_id !== connection.userId) {
      // Notify sender about read receipt
      connectionManager.broadcastToUser(messageData.sender_id, {
        id: generateMessageId(),
        type: 'read_receipt_received',
        namespace: 'chat',
        data: {
          messageId: readReceiptMessage.data.messageId,
          readBy: connection.userId,
          readAt: new Date(),
        },
        timestamp: new Date(),
      });
    }
  } catch (error) {
    logger.error('Error handling read receipt:', error);
  }
}

async function getChatState(userId: string, fastify: FastifyInstance) {
  try {
    // Get user's active pairings
    const { data: pairings } = await fastify.supabase
      .from('pairings')
      .select(`
        id,
        student_id,
        parent_id,
        student:profiles!pairings_student_id_fkey(id, full_name, avatar_url),
        parent:profiles!pairings_parent_id_fkey(id, full_name, avatar_url)
      `)
      .or(`student_id.eq.${userId},parent_id.eq.${userId}`)
      .eq('status', 'active');

    if (!pairings) return { pairings: [], recentMessages: [] };

    // Get recent messages for each pairing
    const recentMessages = [];
    for (const pairing of pairings) {
      const { data: messages } = await fastify.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('pairing_id', pairing.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messages) {
        recentMessages.push(...messages);
      }
    }

    // Sort all messages by timestamp
    recentMessages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      pairings,
      recentMessages: recentMessages.slice(0, 100), // Limit to 100 most recent
    };
  } catch (error) {
    logger.error('Error getting chat state:', error);
    return { pairings: [], recentMessages: [] };
  }
}

async function clearTypingIndicators(userId: string, fastify: FastifyInstance, connectionManager: ConnectionManager) {
  // Get user's pairings and clear typing indicators
  const { data: pairings } = await fastify.supabase
    .from('pairings')
    .select('id, student_id, parent_id')
    .or(`student_id.eq.${userId},parent_id.eq.${userId}`)
    .eq('status', 'active');

  if (pairings) {
    for (const pairing of pairings) {
      await clearTypingIndicator(userId, pairing.id, fastify, connectionManager);
    }
  }
}

async function clearTypingIndicator(
  userId: string, 
  pairingId: string, 
  fastify: FastifyInstance, 
  connectionManager: ConnectionManager
) {
  const { data: pairing } = await fastify.supabase
    .from('pairings')
    .select('student_id, parent_id')
    .eq('id', pairingId)
    .single();

  if (pairing) {
    const recipientId = pairing.student_id === userId 
      ? pairing.parent_id 
      : pairing.student_id;

    connectionManager.broadcastToUser(recipientId, {
      id: generateMessageId(),
      type: 'typing_indicator',
      namespace: 'chat',
      data: {
        userId,
        pairingId,
        isTyping: false,
      },
      timestamp: new Date(),
    });
  }
}

async function sendPushNotificationIfOffline(
  userId: string, 
  message: any, 
  fastify: FastifyInstance
) {
  try {
    // Check if user is online
    const { data: presence } = await fastify.supabase
      .from('presence')
      .select('status, last_heartbeat')
      .eq('user_id', userId)
      .single();

    const isOnline = presence && 
                    presence.status === 'online' && 
                    new Date().getTime() - new Date(presence.last_heartbeat).getTime() < 60000;

    if (!isOnline) {
      // Get user's push subscription
      const { data: profile } = await fastify.supabase
        .from('profiles')
        .select('push_subscription, full_name')
        .eq('id', userId)
        .single();

      if (profile?.push_subscription) {
        // TODO: Implement push notification sending
        logger.debug('Would send push notification', {
          userId,
          messageContent: message.content,
        });
      }
    }
  } catch (error) {
    logger.error('Error checking for push notification:', error);
  }
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

