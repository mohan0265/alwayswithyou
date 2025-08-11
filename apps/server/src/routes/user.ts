import { FastifyInstance } from 'fastify';
import { UpdateUserSettingsRequestSchema } from '@awy/schema';
import { logger } from '@awy/utils';

export async function userRoutes(fastify: FastifyInstance) {
  
  // Get user profile and settings
  fastify.get('/profile', async (request, reply) => {
    try {
      const user = request.user!;

      const { data: profile, error } = await fastify.supabase
        .from('profiles')
        .select(`
          *,
          org:orgs(id, name, logo_url)
        `)
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'User profile not found',
        });
        return;
      }

      // Remove sensitive data
      const { auth_user_id, push_subscription, ...safeProfile } = profile;

      reply.send({
        success: true,
        data: safeProfile,
      });
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user profile',
      });
    }
  });

  // Update user settings
  fastify.post('/settings', async (request, reply) => {
    try {
      const body = UpdateUserSettingsRequestSchema.parse(request.body);
      const user = request.user!;

      // Build update object
      const updateData: any = {};

      if (body.visibleToPartner !== undefined) {
        updateData.visible_to_partner = body.visibleToPartner;
      }

      if (body.dndEnabled !== undefined) {
        updateData.dnd_enabled = body.dndEnabled;
      }

      if (body.quietHours) {
        updateData.quiet_hours = {
          enabled: body.quietHours.enabled,
          start: body.quietHours.start,
          end: body.quietHours.end,
          days: body.quietHours.days,
          timezone: body.quietHours.timezone,
        };
      }

      if (body.notifications) {
        // Store notification preferences in metadata
        const { data: currentProfile } = await fastify.supabase
          .from('profiles')
          .select('metadata')
          .eq('id', user.id)
          .single();

        const currentMetadata = currentProfile?.metadata || {};
        updateData.metadata = {
          ...currentMetadata,
          notifications: body.notifications,
        };
      }

      if (Object.keys(updateData).length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'No valid settings provided',
        });
        return;
      }

      updateData.updated_at = new Date().toISOString();

      // Update user profile
      const { data: updatedProfile, error } = await fastify.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating user settings:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update user settings',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'user_settings_updated',
        event_data: {
          updated_fields: Object.keys(updateData),
        },
      });

      logger.info('User settings updated', {
        userId: user.id,
        updatedFields: Object.keys(updateData),
      });

      // Remove sensitive data
      const { auth_user_id, push_subscription, ...safeProfile } = updatedProfile;

      reply.send({
        success: true,
        data: safeProfile,
      });
    } catch (error) {
      logger.error('Error updating user settings:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user settings',
      });
    }
  });

  // Get user's activity summary
  fastify.get('/activity', async (request, reply) => {
    try {
      const user = request.user!;
      const { days = 7 } = request.query as { days?: number };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get message count
      const { count: messageCount } = await fastify.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Get call count and duration
      const { data: calls } = await fastify.supabase
        .from('calls')
        .select('duration_seconds, status')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .gte('created_at', startDate.toISOString());

      const callStats = calls?.reduce((acc, call) => {
        acc.total++;
        if (call.status === 'ended') {
          acc.completed++;
          acc.totalDuration += call.duration_seconds || 0;
        }
        return acc;
      }, { total: 0, completed: 0, totalDuration: 0 }) || { total: 0, completed: 0, totalDuration: 0 };

      // Get memory count
      const { count: memoryCount } = await fastify.supabase
        .from('memories')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', startDate.toISOString());

      // Get presence data
      const { data: presenceData } = await fastify.supabase
        .from('presence')
        .select('status, last_heartbeat')
        .eq('user_id', user.id)
        .single();

      const activity = {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        messages: {
          sent: messageCount || 0,
        },
        calls: {
          total: callStats.total,
          completed: callStats.completed,
          totalDurationMinutes: Math.round(callStats.totalDuration / 60),
        },
        memories: {
          uploaded: memoryCount || 0,
        },
        presence: {
          currentStatus: presenceData?.status || 'offline',
          lastSeen: presenceData?.last_heartbeat,
        },
      };

      reply.send({
        success: true,
        data: activity,
      });
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user activity',
      });
    }
  });

  // Export user data (GDPR compliance)
  fastify.get('/export', async (request, reply) => {
    try {
      const user = request.user!;

      // Get user profile
      const { data: profile } = await fastify.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get user's pairings
      const { data: pairings } = await fastify.supabase
        .from('pairings')
        .select('*')
        .or(`student_id.eq.${user.id},parent_id.eq.${user.id}`);

      // Get user's messages
      const { data: messages } = await fastify.supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      // Get user's calls
      const { data: calls } = await fastify.supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Get user's memories
      const { data: memories } = await fastify.supabase
        .from('memories')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // Get user's events
      const { data: events } = await fastify.supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          orgId: user.orgId,
          userType: user.userType,
        },
        profile: profile ? {
          ...profile,
          auth_user_id: undefined, // Remove sensitive data
          push_subscription: undefined,
        } : null,
        pairings: pairings || [],
        messages: messages || [],
        calls: calls || [],
        memories: memories || [],
        events: events || [],
      };

      // Log export event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'data_exported',
        event_data: {
          export_timestamp: new Date().toISOString(),
        },
      });

      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="awy-data-export-${user.id}-${Date.now()}.json"`)
        .send(exportData);
    } catch (error) {
      logger.error('Error exporting user data:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export user data',
      });
    }
  });

  // Delete user account and data
  fastify.delete('/account', async (request, reply) => {
    try {
      const user = request.user!;

      // This is a sensitive operation - in production, you might want additional verification
      
      // Revoke all pairings
      await fastify.supabase
        .from('pairings')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .or(`student_id.eq.${user.id},parent_id.eq.${user.id}`);

      // Delete user's messages (or anonymize them)
      await fastify.supabase
        .from('messages')
        .delete()
        .eq('sender_id', user.id);

      // Delete user's memories
      await fastify.supabase
        .from('memories')
        .delete()
        .eq('created_by', user.id);

      // Delete presence data
      await fastify.supabase
        .from('presence')
        .delete()
        .eq('user_id', user.id);

      // Log deletion event before deleting profile
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'account_deleted',
        event_data: {
          deleted_at: new Date().toISOString(),
          user_type: user.userType,
        },
      });

      // Finally, delete the profile
      await fastify.supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      logger.info('User account deleted', {
        userId: user.id,
        userType: user.userType,
      });

      reply.send({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting user account:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete account',
      });
    }
  });
}

