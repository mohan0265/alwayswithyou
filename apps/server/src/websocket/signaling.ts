import { FastifyInstance } from 'fastify';
import { logger } from '@awy/utils';
import { 
  CallOfferMessageSchema,
  CallAnswerMessageSchema,
  CallCandidateMessageSchema,
  CallHangupMessageSchema,
  WSMessageSchema 
} from '@awy/schema';
import type { WebSocketConnection } from './index.js';
import type { ConnectionManager } from './index.js';
import { v4 as uuidv4 } from 'uuid';

interface ActiveCall {
  id: string;
  pairingId: string;
  callerId: string;
  calleeId: string;
  callType: 'video' | 'voice';
  status: 'initiated' | 'ringing' | 'connected' | 'ended';
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
}

// In-memory call state management
const activeCalls = new Map<string, ActiveCall>();

export async function signalingHandler(
  connection: WebSocketConnection,
  connectionManager: ConnectionManager,
  fastify: FastifyInstance
) {
  const { socket, userId, orgId } = connection;

  // Send initial signaling state
  const initialState = await getSignalingState(userId, fastify);
  socket.send(JSON.stringify({
    id: generateMessageId(),
    type: 'signaling_state',
    namespace: 'signaling',
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
        case 'call_offer':
          await handleCallOffer(connection, validatedMessage, fastify, connectionManager);
          break;
        
        case 'call_answer':
          await handleCallAnswer(connection, validatedMessage, fastify, connectionManager);
          break;

        case 'call_candidate':
          await handleCallCandidate(connection, validatedMessage, fastify, connectionManager);
          break;

        case 'call_hangup':
          await handleCallHangup(connection, validatedMessage, fastify, connectionManager);
          break;

        default:
          logger.warn('Unknown signaling message type:', validatedMessage.type);
      }
    } catch (error) {
      logger.error('Error handling signaling message:', error);
      socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'error',
        namespace: 'signaling',
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
      
      // End any active calls for this user
      await endUserCalls(userId, 'connection_lost', fastify, connectionManager);
      
      logger.debug('Signaling connection closed', { userId, connectionId: connection.id });
    } catch (error) {
      logger.error('Error handling signaling disconnection:', error);
    }
  });

  socket.on('error', (error) => {
    logger.error('Signaling WebSocket error:', error);
    connectionManager.removeConnection(connection.id);
  });
}

async function handleCallOffer(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const offerMessage = CallOfferMessageSchema.parse(message);
    
    // Verify pairing exists and is active
    const { data: pairing, error: pairingError } = await fastify.supabase
      .from('pairings')
      .select('*')
      .eq('id', offerMessage.data.pairingId)
      .eq('status', 'active')
      .single();

    if (pairingError || !pairing) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'call_error',
        namespace: 'signaling',
        data: {
          callId: offerMessage.data.callId,
          error: 'Invalid pairing',
          message: 'Pairing not found or not active',
        },
        timestamp: new Date(),
      }));
      return;
    }

    // Verify user is part of the pairing
    if (pairing.student_id !== connection.userId && pairing.parent_id !== connection.userId) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'call_error',
        namespace: 'signaling',
        data: {
          callId: offerMessage.data.callId,
          error: 'Forbidden',
          message: 'You are not part of this pairing',
        },
        timestamp: new Date(),
      }));
      return;
    }

    const calleeId = pairing.student_id === connection.userId 
      ? pairing.parent_id 
      : pairing.student_id;

    // Check if callee is available (not in another call)
    const existingCall = Array.from(activeCalls.values()).find(call => 
      (call.callerId === calleeId || call.calleeId === calleeId) && 
      call.status !== 'ended'
    );

    if (existingCall) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'call_error',
        namespace: 'signaling',
        data: {
          callId: offerMessage.data.callId,
          error: 'User busy',
          message: 'The user is currently in another call',
        },
        timestamp: new Date(),
      }));
      return;
    }

    // Create call record
    const call: ActiveCall = {
      id: offerMessage.data.callId,
      pairingId: offerMessage.data.pairingId,
      callerId: connection.userId,
      calleeId,
      callType: offerMessage.data.callType,
      status: 'initiated',
      startedAt: new Date(),
    };

    activeCalls.set(call.id, call);

    // Save call to database
    await fastify.supabase.from('calls').insert({
      id: call.id,
      pairing_id: call.pairingId,
      caller_id: call.callerId,
      callee_id: call.calleeId,
      call_type: call.callType,
      status: 'initiated',
      started_at: call.startedAt.toISOString(),
    });

    // Forward offer to callee
    connectionManager.broadcastToUser(calleeId, {
      id: generateMessageId(),
      type: 'call_offer_received',
      namespace: 'signaling',
      data: {
        callId: call.id,
        pairingId: call.pairingId,
        callerId: call.callerId,
        callType: call.callType,
        offer: offerMessage.data.offer,
      },
      timestamp: new Date(),
    });

    // Update call status to ringing
    call.status = 'ringing';
    await fastify.supabase
      .from('calls')
      .update({ status: 'ringing' })
      .eq('id', call.id);

    // Send confirmation to caller
    connection.socket.send(JSON.stringify({
      id: generateMessageId(),
      type: 'call_offer_sent',
      namespace: 'signaling',
      data: {
        callId: call.id,
        status: 'ringing',
      },
      timestamp: new Date(),
    }));

    // Set timeout for call answer (30 seconds)
    setTimeout(async () => {
      const currentCall = activeCalls.get(call.id);
      if (currentCall && currentCall.status === 'ringing') {
        await endCall(call.id, 'timeout', fastify, connectionManager);
      }
    }, 30000);

    logger.info('Call offer sent', {
      callId: call.id,
      callerId: call.callerId,
      calleeId: call.calleeId,
      callType: call.callType,
    });
  } catch (error) {
    logger.error('Error handling call offer:', error);
  }
}

async function handleCallAnswer(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const answerMessage = CallAnswerMessageSchema.parse(message);
    
    const call = activeCalls.get(answerMessage.data.callId);
    if (!call) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'call_error',
        namespace: 'signaling',
        data: {
          callId: answerMessage.data.callId,
          error: 'Call not found',
          message: 'Call does not exist or has ended',
        },
        timestamp: new Date(),
      }));
      return;
    }

    // Verify user is the callee
    if (call.calleeId !== connection.userId) {
      connection.socket.send(JSON.stringify({
        id: generateMessageId(),
        type: 'call_error',
        namespace: 'signaling',
        data: {
          callId: call.id,
          error: 'Forbidden',
          message: 'You are not the callee for this call',
        },
        timestamp: new Date(),
      }));
      return;
    }

    // Update call status
    call.status = 'connected';
    call.connectedAt = new Date();

    await fastify.supabase
      .from('calls')
      .update({ 
        status: 'connected',
        connected_at: call.connectedAt.toISOString(),
      })
      .eq('id', call.id);

    // Forward answer to caller
    connectionManager.broadcastToUser(call.callerId, {
      id: generateMessageId(),
      type: 'call_answer_received',
      namespace: 'signaling',
      data: {
        callId: call.id,
        answer: answerMessage.data.answer,
      },
      timestamp: new Date(),
    });

    // Send confirmation to callee
    connection.socket.send(JSON.stringify({
      id: generateMessageId(),
      type: 'call_answered',
      namespace: 'signaling',
      data: {
        callId: call.id,
        status: 'connected',
      },
      timestamp: new Date(),
    }));

    logger.info('Call answered', {
      callId: call.id,
      callerId: call.callerId,
      calleeId: call.calleeId,
    });
  } catch (error) {
    logger.error('Error handling call answer:', error);
  }
}

async function handleCallCandidate(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const candidateMessage = CallCandidateMessageSchema.parse(message);
    
    const call = activeCalls.get(candidateMessage.data.callId);
    if (!call) {
      return; // Silently ignore candidates for non-existent calls
    }

    // Verify user is part of the call
    if (call.callerId !== connection.userId && call.calleeId !== connection.userId) {
      return;
    }

    // Forward candidate to the other party
    const targetId = call.callerId === connection.userId ? call.calleeId : call.callerId;
    
    connectionManager.broadcastToUser(targetId, {
      id: generateMessageId(),
      type: 'call_candidate_received',
      namespace: 'signaling',
      data: {
        callId: call.id,
        candidate: candidateMessage.data.candidate,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error handling call candidate:', error);
  }
}

async function handleCallHangup(
  connection: WebSocketConnection,
  message: any,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  try {
    const hangupMessage = CallHangupMessageSchema.parse(message);
    
    await endCall(hangupMessage.data.callId, hangupMessage.data.reason || 'hangup', fastify, connectionManager);
  } catch (error) {
    logger.error('Error handling call hangup:', error);
  }
}

async function endCall(
  callId: string,
  reason: string,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  const call = activeCalls.get(callId);
  if (!call) return;

  // Update call status
  call.status = 'ended';
  call.endedAt = new Date();

  const duration = call.connectedAt 
    ? Math.floor((call.endedAt.getTime() - call.connectedAt.getTime()) / 1000)
    : 0;

  // Update database
  await fastify.supabase
    .from('calls')
    .update({
      status: 'ended',
      ended_at: call.endedAt.toISOString(),
      duration_seconds: duration,
      metadata: { end_reason: reason },
    })
    .eq('id', call.id);

  // Notify both parties
  const hangupMessage = {
    id: generateMessageId(),
    type: 'call_ended',
    namespace: 'signaling',
    data: {
      callId: call.id,
      reason,
      duration,
    },
    timestamp: new Date(),
  };

  connectionManager.broadcastToUser(call.callerId, hangupMessage);
  connectionManager.broadcastToUser(call.calleeId, hangupMessage);

  // Remove from active calls
  activeCalls.delete(callId);

  logger.info('Call ended', {
    callId: call.id,
    reason,
    duration,
  });
}

async function endUserCalls(
  userId: string,
  reason: string,
  fastify: FastifyInstance,
  connectionManager: ConnectionManager
) {
  const userCalls = Array.from(activeCalls.values()).filter(call => 
    (call.callerId === userId || call.calleeId === userId) && call.status !== 'ended'
  );

  for (const call of userCalls) {
    await endCall(call.id, reason, fastify, connectionManager);
  }
}

async function getSignalingState(userId: string, fastify: FastifyInstance) {
  try {
    // Get recent calls for the user
    const { data: recentCalls } = await fastify.supabase
      .from('calls')
      .select(`
        *,
        caller:profiles!calls_caller_id_fkey(id, full_name, avatar_url),
        callee:profiles!calls_callee_id_fkey(id, full_name, avatar_url)
      `)
      .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get active calls
    const userActiveCalls = Array.from(activeCalls.values()).filter(call => 
      call.callerId === userId || call.calleeId === userId
    );

    return {
      recentCalls: recentCalls || [],
      activeCalls: userActiveCalls,
    };
  } catch (error) {
    logger.error('Error getting signaling state:', error);
    return {
      recentCalls: [],
      activeCalls: [],
    };
  }
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

