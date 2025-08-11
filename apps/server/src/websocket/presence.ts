import { FastifyInstance } from 'fastify';
import { logger } from '@awy/utils';
import { 
  PresenceUpdateMessageSchema, 
  PresenceHeartbeatMessageSchema,
  WSMessageSchema 
} from '@awy/schema';
import type { WebSocketConnection } from './index.js';
import type { ConnectionManager } from './index.js';

export async function presenceHandler(
  connection: WebSocketConnection,
  connectionManager: ConnectionManager,
  fastify: FastifyInstance
) {
  const { socket, userId, orgId } = connection;

  // Set user as online when they connect
  await updateUserPresence(userId, 'online', fastify);
  
  // Notify paired partners about presence change
  await notifyPairedPartners(userId, 'online', fastify, connectionManager);

  // Send initial presence state
  const initialPresence = await getUserPresenceState(userId, fastify);
  socket.send(JSON.stringify({
    id: generateMessageId(),
    type: 'presence_state',
    namespace: 'presence',
    data: initialPresence,
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
        case 'heartbeat':
          await handleHeartbeat(connection, validatedMessage, fastify, connectionManager);
          break;
        
        case 'presence_update':
          await handlePresenceUpdate(connection, validatedMessage, fastify, connectionManager);
          break;

        default:
          logger.warn('Unknown presence message type:', validatedMessage.type);
      }
    } catch (error) {
      logger.error('Error handling presence message:', error);
      socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'error',
        namespace: 'presence',
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
      
      // Check if user has other active connections
      const userConnections = connectionManager.getUserConnections(userId);
      const hasOtherConnections = userConnections.length > 0;

      if (!hasOtherConnections) {
        // Set user as offline if no other connections
        await updateUserPresence(userId, 'offline', fastify);
        await notifyPairedPartners(userId, 'offline', fastify, connectionManager);
      }

      logger.debug('Presence connection closed', { userId, connectionId: connection.id });
    } catch (error) {
      logger.error('Error handling presence disconnection:', error);
    }
  });

  socket.on('error', (error) => {
    logger.error('Presence WebSocket error:', error);
    connectionManager.removeConnection(connection.id);
  });
}

async function handleHeartbeat(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const heartbeatMessage = PresenceHeartbeatMessageSchema.parse(message);
    
    // Update presence status if provided
    if (heartbeatMessage.data.status) {
      await updateUserPresence(connection.userId, heartbeatMessage.data.status, fastify);
      await notifyPairedPartners(connection.userId, heartbeatMessage.data.status, fastify, connectionManager);
    }

    // Send heartbeat response
    connection.socket.send(JSON.stringify({
      id: generateMessageId(),
      type: 'heartbeat_ack',
      namespace: 'presence',
      data: {
        timestamp: new Date(),
      },
      timestamp: new Date(),
    }));
  } catch (error) {
    logger.error('Error handling heartbeat:', error);
  }
}

async function handlePresenceUpdate(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const presenceMessage = PresenceUpdateMessageSchema.parse(message);
    
    // Only allow users to update their own presence
    if (presenceMessage.data.userId !== connection.userId) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'error',
        namespace: 'presence',
        data: {
          error: 'Forbidden',
          message: 'Cannot update presence for other users',
        },
        timestamp: new Date(),
      }));
      return;
    }

    await updateUserPresence(
      presenceMessage.data.userId, 
      presenceMessage.data.status, 
      fastify,
      presenceMessage.data.metadata
    );

    await notifyPairedPartners(
      presenceMessage.data.userId, 
      presenceMessage.data.status, 
      fastify, 
      connectionManager,
      presenceMessage.data.metadata
    );

    // Send confirmation
    connection.socket.send(JSON.stringify({
      id: generateMessageId(),
      type: 'presence_updated',
      namespace: 'presence',
      data: {
        status: presenceMessage.data.status,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    }));
  } catch (error) {
    logger.error('Error handling presence update:', error);
  }
}

async function updateUserPresence(
  userId: string, 
  status: 'online' | 'away' | 'busy' | 'offline',
  fastify: FastifyInstance,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await fastify.supabase
      .from('presence')
      .upsert({
        user_id: userId,
        status,
        last_heartbeat: new Date().toISOString(),
        metadata: metadata || {},
        updated_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('Error updating user presence:', error);
    }
  } catch (error) {
    logger.error('Error updating user presence:', error);
  }
}

async function notifyPairedPartners(
  userId: string,
  status: 'online' | 'away' | 'busy' | 'offline',
  fastify: FastifyInstance,
  connectionManager: ConnectionManager,
  metadata?: Record<string, any>
) {
  try {
    // Get user's active pairings
    const { data: pairings, error } = await fastify.supabase
      .from('pairings')
      .select('student_id, parent_id')
      .or(`student_id.eq.${userId},parent_id.eq.${userId}`)
      .eq('status', 'active');

    if (error || !pairings) {
      return;
    }

    // Get partner IDs
    const partnerIds = pairings.map(pairing => 
      pairing.student_id === userId ? pairing.parent_id : pairing.student_id
    );

    // Check visibility settings
    const { data: userProfile } = await fastify.supabase
      .from('profiles')
      .select('user_type, visible_to_partner, dnd_enabled, quiet_hours')
      .eq('id', userId)
      .single();

    if (!userProfile) return;

    // Apply visibility rules
    let shouldNotify = true;
    
    if (userProfile.user_type === 'student' && !userProfile.visible_to_partner) {
      shouldNotify = false;
    }

    // Check DND and quiet hours
    if (userProfile.dnd_enabled) {
      shouldNotify = false;
    }

    // TODO: Implement quiet hours check using date utilities

    if (shouldNotify) {
      // Notify all paired partners
      partnerIds.forEach(partnerId => {
        connectionManager.broadcastToUser(partnerId, {
          id: generateMessageId(),
          type: 'partner_presence_update',
          namespace: 'presence',
          data: {
            userId,
            status,
            metadata,
          },
          timestamp: new Date(),
        });
      });
    }
  } catch (error) {
    logger.error('Error notifying paired partners:', error);
  }
}

async function getUserPresenceState(userId: string, fastify: FastifyInstance) {
  try {
    // Get user's own presence
    const { data: ownPresence } = await fastify.supabase
      .from('presence')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get paired partners' presence
    const { data: pairings } = await fastify.supabase
      .from('pairings')
      .select(`
        student_id,
        parent_id,
        student:profiles!pairings_student_id_fkey(id, visible_to_partner, user_type),
        parent:profiles!pairings_parent_id_fkey(id, visible_to_partner, user_type)
      `)
      .or(`student_id.eq.${userId},parent_id.eq.${userId}`)
      .eq('status', 'active');

    const partnersPresence = [];
    
    if (pairings) {
      for (const pairing of pairings) {
        const partnerId = pairing.student_id === userId ? pairing.parent_id : pairing.student_id;
        const partnerProfile = pairing.student_id === userId ? pairing.parent : pairing.student;
        
        // Check if partner's presence should be visible
        let shouldShowPresence = true;
        
        if (partnerProfile.user_type === 'student' && !partnerProfile.visible_to_partner) {
          shouldShowPresence = false;
        }

        if (shouldShowPresence) {
          const { data: partnerPresence } = await fastify.supabase
            .from('presence')
            .select('status, last_heartbeat, metadata')
            .eq('user_id', partnerId)
            .single();

          if (partnerPresence) {
            partnersPresence.push({
              userId: partnerId,
              ...partnerPresence,
            });
          }
        }
      }
    }

    return {
      own: ownPresence,
      partners: partnersPresence,
    };
  } catch (error) {
    logger.error('Error getting user presence state:', error);
    return {
      own: null,
      partners: [],
    };
  }
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

