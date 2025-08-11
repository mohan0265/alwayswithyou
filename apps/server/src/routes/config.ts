import { FastifyInstance } from 'fastify';
import { logger } from '@awy/utils';

export async function configRoutes(fastify: FastifyInstance) {
  
  // Get organization configuration
  fastify.get('/:orgId', async (request, reply) => {
    try {
      const { orgId } = request.params as { orgId: string };

      // Get organization data
      const { data: org, error: orgError } = await fastify.supabase
        .from('orgs')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Organization not found',
        });
        return;
      }

      // Build configuration response
      const config = {
        orgId: org.id,
        branding: {
          name: org.name,
          logo: org.logo_url,
          colors: org.brand_colors || {
            primary: '#4F46E5',
            secondary: '#EC4899',
            accent: '#10B981',
            background: '#FFFFFF',
            text: '#1F2937',
          },
        },
        quickTexts: org.quick_texts || [
          'Are you online? Can we talk?',
          'I\'m studying, can we chat after 10 pm?',
          'Miss you! ❤️',
          'How was your day?',
          'Love you so much!',
        ],
        policies: org.policies || {
          defaultVisibility: true,
          quietHours: {
            enabled: true,
            start: '19:00',
            end: '23:00',
            days: [1, 2, 3, 4, 5], // Monday to Friday
            timezone: 'UTC',
          },
          flashbackCap: 3,
          dndRespected: true,
          memoryFlashbacks: {
            enabled: true,
            dailyCap: 3,
            quietHours: true,
            pauseDuration: 24,
          },
        },
        providers: {
          push: {
            webpush: {
              type: 'primary',
              enabled: true,
              weight: 100,
              config: {
                publicKey: fastify.config.webPush.publicVapidKey,
              },
            },
          },
          ice: {
            static: {
              type: 'primary',
              enabled: true,
              weight: 100,
              config: {
                stunUrls: fastify.config.ice.stunUrls,
                turnUrls: fastify.config.ice.turnUrls,
                turnUsername: fastify.config.ice.turnUsername,
                turnPassword: fastify.config.ice.turnPassword,
              },
            },
          },
          moderation: {
            none: {
              type: 'primary',
              enabled: true,
              weight: 100,
              config: {},
            },
          },
          captioning: {
            none: {
              type: 'primary',
              enabled: true,
              weight: 100,
              config: {},
            },
          },
        },
      };

      // Cache headers for configuration
      reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
      reply.send({
        success: true,
        data: config,
      });

      logger.debug('Configuration served', { orgId });
    } catch (error) {
      logger.error('Error serving configuration:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to load configuration',
      });
    }
  });

  // Get ICE servers for WebRTC
  fastify.get('/:orgId/ice', async (request, reply) => {
    try {
      const { orgId } = request.params as { orgId: string };

      // Verify organization exists
      const { data: org, error: orgError } = await fastify.supabase
        .from('orgs')
        .select('id')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Organization not found',
        });
        return;
      }

      const iceServers = [
        ...fastify.config.ice.stunUrls.map((url: string) => ({ urls: url })),
      ];

      // Add TURN servers if configured
      if (fastify.config.ice.turnUrls.length > 0) {
        iceServers.push(
          ...fastify.config.ice.turnUrls.map((url: string) => ({
            urls: url,
            username: fastify.config.ice.turnUsername,
            credential: fastify.config.ice.turnPassword,
          }))
        );
      }

      // Short cache for ICE servers
      reply.header('Cache-Control', 'public, max-age=60'); // 1 minute
      reply.send({
        success: true,
        data: {
          iceServers,
        },
      });

      logger.debug('ICE servers served', { orgId, serverCount: iceServers.length });
    } catch (error) {
      logger.error('Error serving ICE servers:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to load ICE servers',
      });
    }
  });

  // Get VAPID public key for push notifications
  fastify.get('/:orgId/vapid', async (request, reply) => {
    try {
      const { orgId } = request.params as { orgId: string };

      // Verify organization exists
      const { data: org, error: orgError } = await fastify.supabase
        .from('orgs')
        .select('id')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Organization not found',
        });
        return;
      }

      // Long cache for VAPID key
      reply.header('Cache-Control', 'public, max-age=86400'); // 24 hours
      reply.send({
        success: true,
        data: {
          publicKey: fastify.config.webPush.publicVapidKey,
        },
      });

      logger.debug('VAPID key served', { orgId });
    } catch (error) {
      logger.error('Error serving VAPID key:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to load VAPID key',
      });
    }
  });
}

