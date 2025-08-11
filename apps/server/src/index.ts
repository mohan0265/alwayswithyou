import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '@awy/utils';
import { logger } from '@awy/utils';

// Import route handlers
import { registerApiRoutes } from './routes/index.js';
import { registerWebSocketHandlers } from './websocket/index.js';

// Environment configuration
const config = {
  port: parseInt(process.env.PORT || '8090'),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    jwtSecret: process.env.SUPABASE_JWT_SECRET!,
  },
  webPush: {
    publicVapidKey: process.env.WEB_PUSH_PUBLIC_VAPID_KEY!,
    privateVapidKey: process.env.WEB_PUSH_PRIVATE_VAPID_KEY!,
    contact: process.env.PUSH_CONTACT || 'mailto:admin@example.com',
  },
  ice: {
    stunUrls: process.env.STUN_URLS?.split(',') || ['stun:stun.l.google.com:19302'],
    turnUrls: process.env.TURN_URLS?.split(',') || [],
    turnUsername: process.env.TURN_USERNAME,
    turnPassword: process.env.TURN_PASSWORD,
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'WEB_PUSH_PUBLIC_VAPID_KEY',
  'WEB_PUSH_PRIVATE_VAPID_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  },
});

// Initialize services
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
const authService = new AuthService(config.supabase);

// Add services to Fastify context
fastify.decorate('supabase', supabase);
fastify.decorate('authService', authService);
fastify.decorate('config', config);

// Register plugins
await fastify.register(helmet, {
  contentSecurityPolicy: false, // Disable CSP for WebSocket connections
});

await fastify.register(cors, {
  origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => ({
    code: 'RATE_LIMIT_EXCEEDED',
    error: 'Rate limit exceeded',
    message: `Only ${context.max} requests per ${context.after} allowed.`,
    date: Date.now(),
    expiresIn: context.ttl,
  }),
});

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

await fastify.register(websocket, {
  options: {
    maxPayload: 1024 * 1024, // 1MB
    verifyClient: (info) => {
      // Basic verification - can be enhanced with auth
      return true;
    },
  },
});

// Health check endpoint
fastify.get('/healthz', async (request, reply) => {
  try {
    // Check database connection
    const { error } = await supabase.from('orgs').select('id').limit(1);
    if (error) throw error;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Register API routes
await registerApiRoutes(fastify);

// Register WebSocket handlers
await registerWebSocketHandlers(fastify);

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  logger.error('Unhandled error:', error);
  
  if (error.validation) {
    reply.code(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.validation,
    });
    return;
  }

  if (error.statusCode) {
    reply.code(error.statusCode).send({
      error: error.name || 'Error',
      message: error.message,
    });
    return;
  }

  reply.code(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await fastify.close();
    logger.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.port,
      host: config.host,
    });
    
    logger.info(`AWY Server running on http://${config.host}:${config.port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

start();

// Export for testing
export { fastify };

