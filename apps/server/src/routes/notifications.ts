import { FastifyInstance } from 'fastify';
import { RegisterPushSubscriptionRequestSchema } from '@awy/schema';
import { logger } from '@awy/utils';
import webpush from 'web-push';

export async function notificationRoutes(fastify: FastifyInstance) {
  
  // Configure web push
  webpush.setVapidDetails(
    fastify.config.webPush.contact,
    fastify.config.webPush.publicVapidKey,
    fastify.config.webPush.privateVapidKey
  );

  // Register push subscription
  fastify.post('/register', async (request, reply) => {
    try {
      const body = RegisterPushSubscriptionRequestSchema.parse(request.body);
      const user = request.user!;

      // Update user's push subscription
      const { error } = await fastify.supabase
        .from('profiles')
        .update({
          push_subscription: body.subscription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        logger.error('Error registering push subscription:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to register push subscription',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'push_subscription_registered',
        event_data: {
          endpoint: body.subscription.endpoint,
          user_agent: body.userAgent,
        },
      });

      logger.info('Push subscription registered', {
        userId: user.id,
        endpoint: body.subscription.endpoint,
      });

      reply.send({
        success: true,
        message: 'Push subscription registered successfully',
      });
    } catch (error) {
      logger.error('Error registering push subscription:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to register push subscription',
      });
    }
  });

  // Send test notification
  fastify.post('/test', async (request, reply) => {
    try {
      const user = request.user!;

      // Get user's push subscription
      const { data: profile, error } = await fastify.supabase
        .from('profiles')
        .select('push_subscription')
        .eq('id', user.id)
        .single();

      if (error || !profile?.push_subscription) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'No push subscription found for user',
        });
        return;
      }

      const payload = JSON.stringify({
        title: 'AWY Test Notification',
        body: 'This is a test notification from Always With You',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'test',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      });

      await webpush.sendNotification(profile.push_subscription, payload);

      logger.info('Test notification sent', {
        userId: user.id,
      });

      reply.send({
        success: true,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to send test notification',
      });
    }
  });

  // Unregister push subscription
  fastify.delete('/unregister', async (request, reply) => {
    try {
      const user = request.user!;

      // Remove user's push subscription
      const { error } = await fastify.supabase
        .from('profiles')
        .update({
          push_subscription: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        logger.error('Error unregistering push subscription:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to unregister push subscription',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'push_subscription_unregistered',
        event_data: {},
      });

      logger.info('Push subscription unregistered', {
        userId: user.id,
      });

      reply.send({
        success: true,
        message: 'Push subscription unregistered successfully',
      });
    } catch (error) {
      logger.error('Error unregistering push subscription:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to unregister push subscription',
      });
    }
  });

  // Get notification preferences
  fastify.get('/preferences', async (request, reply) => {
    try {
      const user = request.user!;

      const { data: profile, error } = await fastify.supabase
        .from('profiles')
        .select('push_subscription, metadata')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'User profile not found',
        });
        return;
      }

      const preferences = {
        pushEnabled: !!profile.push_subscription,
        notifications: profile.metadata?.notifications || {
          push: true,
          email: true,
          inApp: true,
        },
      };

      reply.send({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch notification preferences',
      });
    }
  });
}

// Utility function to send push notification to a user
export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  },
  fastify: FastifyInstance
): Promise<boolean> {
  try {
    // Get user's push subscription
    const { data: profile, error } = await fastify.supabase
      .from('profiles')
      .select('push_subscription, metadata')
      .eq('id', userId)
      .single();

    if (error || !profile?.push_subscription) {
      logger.debug('No push subscription found for user', { userId });
      return false;
    }

    // Check if user has push notifications enabled
    const notificationPrefs = profile.metadata?.notifications;
    if (notificationPrefs && !notificationPrefs.push) {
      logger.debug('Push notifications disabled for user', { userId });
      return false;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      tag: payload.tag || 'awy-notification',
      data: {
        ...payload.data,
        timestamp: new Date().toISOString(),
      },
    });

    await webpush.sendNotification(profile.push_subscription, notificationPayload);

    logger.debug('Push notification sent', {
      userId,
      title: payload.title,
    });

    return true;
  } catch (error) {
    logger.error('Error sending push notification:', error);
    return false;
  }
}

