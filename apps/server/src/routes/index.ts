import { FastifyInstance } from 'fastify';
import { pairingRoutes } from './pairings.js';
import { configRoutes } from './config.js';
import { memoriesRoutes } from './memories.js';
import { userRoutes } from './user.js';
import { notificationRoutes } from './notifications.js';
import { reportRoutes } from './reports.js';

export async function registerApiRoutes(fastify: FastifyInstance) {
  // Register all API routes under /v1 prefix
  await fastify.register(async function (fastify) {
    // Authentication middleware for protected routes
    fastify.addHook('preHandler', async (request, reply) => {
      // Skip auth for public endpoints
      const publicEndpoints = ['/config/', '/healthz'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        request.url.startsWith(endpoint)
      );
      
      if (isPublicEndpoint) {
        return;
      }

      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7);
      const user = await fastify.authService.verifyToken(token);
      
      if (!user) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      // Add user to request context
      request.user = user;
    });

    // Register route modules
    await fastify.register(pairingRoutes, { prefix: '/pairings' });
    await fastify.register(configRoutes, { prefix: '/config' });
    await fastify.register(memoriesRoutes, { prefix: '/memories' });
    await fastify.register(userRoutes, { prefix: '/user' });
    await fastify.register(notificationRoutes, { prefix: '/notify' });
    await fastify.register(reportRoutes, { prefix: '/report' });
    
  }, { prefix: '/v1' });
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      orgId: string;
      userType: 'student' | 'parent' | 'admin';
      timezone: string;
    };
  }
  
  interface FastifyInstance {
    supabase: any;
    authService: any;
    config: any;
  }
}

