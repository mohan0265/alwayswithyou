import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { IncomingMessage } from 'http';
import { logger } from '@awy/utils';
import { WSMessageSchema } from '@awy/schema';
import { presenceHandler } from './presence.js';
import { chatHandler } from './chat.js';
import { signalingHandler } from './signaling.js';

interface WebSocketConnection {
  id: string;
  userId: string;
  orgId: string;
  userType: 'student' | 'parent' | 'admin';
  socket: SocketStream;
  lastHeartbeat: Date;
  namespace: string;
}

// Global connection manager
class ConnectionManager {
  private connections = new Map<string, WebSocketConnection>();
  private userConnections = new Map<string, Set<string>>();

  addConnection(connection: WebSocketConnection) {
    this.connections.set(connection.id, connection);
    
    if (!this.userConnections.has(connection.userId)) {
      this.userConnections.set(connection.userId, new Set());
    }
    this.userConnections.get(connection.userId)!.add(connection.id);

    logger.debug('WebSocket connection added', {
      connectionId: connection.id,
      userId: connection.userId,
      namespace: connection.namespace,
    });
  }

  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }

      logger.debug('WebSocket connection removed', {
        connectionId,
        userId: connection.userId,
        namespace: connection.namespace,
      });
    }
  }

  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  getUserConnections(userId: string): WebSocketConnection[] {
    const connectionIds = this.userConnections.get(userId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(Boolean) as WebSocketConnection[];
  }

  getConnectionsByNamespace(namespace: string): WebSocketConnection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.namespace === namespace);
  }

  broadcastToUser(userId: string, message: any, excludeConnectionId?: string) {
    const connections = this.getUserConnections(userId);
    connections.forEach(conn => {
      if (conn.id !== excludeConnectionId) {
        try {
          conn.socket.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Error broadcasting to user:', error);
          this.removeConnection(conn.id);
        }
      }
    });
  }

  broadcastToNamespace(namespace: string, message: any, excludeConnectionId?: string) {
    const connections = this.getConnectionsByNamespace(namespace);
    connections.forEach(conn => {
      if (conn.id !== excludeConnectionId) {
        try {
          conn.socket.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Error broadcasting to namespace:', error);
          this.removeConnection(conn.id);
        }
      }
    });
  }

  getStats() {
    const namespaceStats = new Map<string, number>();
    this.connections.forEach(conn => {
      const count = namespaceStats.get(conn.namespace) || 0;
      namespaceStats.set(conn.namespace, count + 1);
    });

    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      namespaces: Object.fromEntries(namespaceStats),
    };
  }
}

const connectionManager = new ConnectionManager();

export async function registerWebSocketHandlers(fastify: FastifyInstance) {
  
  // WebSocket authentication middleware
  const authenticateWebSocket = async (request: IncomingMessage): Promise<any> => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      throw new Error('Missing authentication token');
    }

    const user = await fastify.authService.verifyToken(token);
    if (!user) {
      throw new Error('Invalid authentication token');
    }

    return user;
  };

  // Presence WebSocket namespace
  fastify.register(async function (fastify) {
    fastify.get('/presence', { websocket: true }, async (connection, request) => {
      try {
        const user = await authenticateWebSocket(request.raw);
        const connectionId = `presence_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const wsConnection: WebSocketConnection = {
          id: connectionId,
          userId: user.id,
          orgId: user.orgId,
          userType: user.userType,
          socket: connection,
          lastHeartbeat: new Date(),
          namespace: 'presence',
        };

        connectionManager.addConnection(wsConnection);
        await presenceHandler(wsConnection, connectionManager, fastify);

      } catch (error) {
        logger.error('WebSocket presence authentication failed:', error);
        connection.terminate();
      }
    });
  }, { prefix: '/ws' });

  // Chat WebSocket namespace
  fastify.register(async function (fastify) {
    fastify.get('/chat', { websocket: true }, async (connection, request) => {
      try {
        const user = await authenticateWebSocket(request.raw);
        const connectionId = `chat_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const wsConnection: WebSocketConnection = {
          id: connectionId,
          userId: user.id,
          orgId: user.orgId,
          userType: user.userType,
          socket: connection,
          lastHeartbeat: new Date(),
          namespace: 'chat',
        };

        connectionManager.addConnection(wsConnection);
        await chatHandler(wsConnection, connectionManager, fastify);

      } catch (error) {
        logger.error('WebSocket chat authentication failed:', error);
        connection.terminate();
      }
    });
  }, { prefix: '/ws' });

  // Signaling WebSocket namespace
  fastify.register(async function (fastify) {
    fastify.get('/signaling', { websocket: true }, async (connection, request) => {
      try {
        const user = await authenticateWebSocket(request.raw);
        const connectionId = `signaling_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const wsConnection: WebSocketConnection = {
          id: connectionId,
          userId: user.id,
          orgId: user.orgId,
          userType: user.userType,
          socket: connection,
          lastHeartbeat: new Date(),
          namespace: 'signaling',
        };

        connectionManager.addConnection(wsConnection);
        await signalingHandler(wsConnection, connectionManager, fastify);

      } catch (error) {
        logger.error('WebSocket signaling authentication failed:', error);
        connection.terminate();
      }
    });
  }, { prefix: '/ws' });

  // WebSocket stats endpoint
  fastify.get('/ws/stats', async (request, reply) => {
    const user = request.user;
    if (!user || user.userType !== 'admin') {
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    reply.send({
      success: true,
      data: connectionManager.getStats(),
    });
  });

  // Cleanup disconnected connections periodically
  setInterval(() => {
    const now = new Date();
    const staleConnections: string[] = [];

    connectionManager['connections'].forEach((conn, id) => {
      const timeSinceHeartbeat = now.getTime() - conn.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > 60000) { // 1 minute timeout
        staleConnections.push(id);
      }
    });

    staleConnections.forEach(id => {
      connectionManager.removeConnection(id);
    });

    if (staleConnections.length > 0) {
      logger.debug('Cleaned up stale connections', { count: staleConnections.length });
    }
  }, 30000); // Check every 30 seconds
}

export { ConnectionManager, connectionManager };
export type { WebSocketConnection };

