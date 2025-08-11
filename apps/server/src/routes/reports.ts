import { FastifyInstance } from 'fastify';
import { CreateReportRequestSchema } from '@awy/schema';
import { logger } from '@awy/utils';
import { v4 as uuidv4 } from 'uuid';

export async function reportRoutes(fastify: FastifyInstance) {
  
  // Create a new report
  fastify.post('/', async (request, reply) => {
    try {
      const body = CreateReportRequestSchema.parse(request.body);
      const user = request.user!;

      // Validate the reported content exists and user has access
      let contentExists = false;
      let contentData: any = null;

      switch (body.contentType) {
        case 'message':
          const { data: message } = await fastify.supabase
            .from('messages')
            .select('*, pairing:pairings(*)')
            .eq('id', body.contentId)
            .single();
          
          if (message && message.pairing) {
            const pairing = message.pairing;
            contentExists = pairing.student_id === user.id || pairing.parent_id === user.id;
            contentData = message;
          }
          break;

        case 'memory':
          const { data: memory } = await fastify.supabase
            .from('memories')
            .select('*, pairing:pairings(*)')
            .eq('id', body.contentId)
            .single();
          
          if (memory && memory.pairing) {
            const pairing = memory.pairing;
            contentExists = pairing.student_id === user.id || pairing.parent_id === user.id;
            contentData = memory;
          }
          break;

        case 'user':
          // Check if the reported user is in a pairing with the reporter
          const { data: userPairings } = await fastify.supabase
            .from('pairings')
            .select('*')
            .or(`student_id.eq.${user.id},parent_id.eq.${user.id}`)
            .or(`student_id.eq.${body.contentId},parent_id.eq.${body.contentId}`)
            .eq('status', 'active');

          contentExists = userPairings && userPairings.length > 0;
          if (contentExists) {
            const { data: reportedUser } = await fastify.supabase
              .from('profiles')
              .select('id, full_name, email, user_type')
              .eq('id', body.contentId)
              .single();
            contentData = reportedUser;
          }
          break;
      }

      if (!contentExists) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Content not found or you do not have access to report it',
        });
        return;
      }

      // Check if user has already reported this content
      const { data: existingReport } = await fastify.supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('content_type', body.contentType)
        .eq('content_id', body.contentId)
        .single();

      if (existingReport) {
        reply.code(409).send({
          error: 'Conflict',
          message: 'You have already reported this content',
        });
        return;
      }

      // Create report
      const reportId = uuidv4();
      const { data: report, error } = await fastify.supabase
        .from('reports')
        .insert({
          id: reportId,
          org_id: user.orgId,
          reporter_id: user.id,
          content_type: body.contentType,
          content_id: body.contentId,
          reason: body.reason,
          description: body.description,
          status: 'pending',
          metadata: {
            content_snapshot: contentData,
            user_agent: request.headers['user-agent'],
            ip_address: request.ip,
          },
        })
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) {
        logger.error('Error creating report:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create report',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'content_reported',
        event_data: {
          report_id: reportId,
          content_type: body.contentType,
          content_id: body.contentId,
          reason: body.reason,
        },
      });

      logger.info('Content reported', {
        reportId,
        reporterId: user.id,
        contentType: body.contentType,
        contentId: body.contentId,
        reason: body.reason,
      });

      reply.send({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error creating report:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create report',
      });
    }
  });

  // Get reports (admin only)
  fastify.get('/', async (request, reply) => {
    try {
      const user = request.user!;

      if (user.userType !== 'admin') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can view reports',
        });
        return;
      }

      const { 
        page = 1, 
        limit = 20, 
        status = 'all',
        content_type = 'all' 
      } = request.query as any;
      
      const offset = (page - 1) * limit;

      let query = fastify.supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(id, full_name, email, user_type),
          reviewer:profiles!reports_reviewed_by_fkey(id, full_name, email)
        `, { count: 'exact' })
        .eq('org_id', user.orgId);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (content_type !== 'all') {
        query = query.eq('content_type', content_type);
      }

      const { data: reports, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching reports:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch reports',
        });
        return;
      }

      const totalPages = Math.ceil((count || 0) / limit);

      reply.send({
        success: true,
        data: reports,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      logger.error('Error fetching reports:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch reports',
      });
    }
  });

  // Update report status (admin only)
  fastify.post('/:id/review', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status, action, notes } = request.body as {
        status: 'reviewed' | 'dismissed' | 'escalated';
        action?: 'none' | 'warning' | 'content_removal' | 'account_suspension';
        notes?: string;
      };
      const user = request.user!;

      if (user.userType !== 'admin') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can review reports',
        });
        return;
      }

      // Get report
      const { data: report, error: reportError } = await fastify.supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (reportError || !report) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Report not found',
        });
        return;
      }

      // Update report
      const { data: updatedReport, error: updateError } = await fastify.supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          resolution: {
            action: action || 'none',
            notes: notes || '',
            reviewed_by: user.id,
          },
        })
        .eq('id', id)
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(id, full_name, email),
          reviewer:profiles!reports_reviewed_by_fkey(id, full_name, email)
        `)
        .single();

      if (updateError) {
        logger.error('Error updating report:', updateError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update report',
        });
        return;
      }

      // Take action if specified
      if (action && action !== 'none') {
        await takeReportAction(report, action, user.id, fastify);
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'report_reviewed',
        event_data: {
          report_id: id,
          status,
          action: action || 'none',
          has_notes: !!notes,
        },
      });

      logger.info('Report reviewed', {
        reportId: id,
        reviewedBy: user.id,
        status,
        action: action || 'none',
      });

      reply.send({
        success: true,
        data: updatedReport,
      });
    } catch (error) {
      logger.error('Error reviewing report:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to review report',
      });
    }
  });

  // Get report by ID (admin only)
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (user.userType !== 'admin') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can view reports',
        });
        return;
      }

      const { data: report, error } = await fastify.supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(id, full_name, email, user_type),
          reviewer:profiles!reports_reviewed_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error || !report) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Report not found',
        });
        return;
      }

      reply.send({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error fetching report:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch report',
      });
    }
  });
}

async function takeReportAction(
  report: any,
  action: string,
  reviewerId: string,
  fastify: FastifyInstance
) {
  try {
    switch (action) {
      case 'content_removal':
        if (report.content_type === 'message') {
          await fastify.supabase
            .from('messages')
            .update({
              content: '[Message removed by moderator]',
              metadata: {
                ...report.metadata,
                moderated: true,
                moderated_by: reviewerId,
                moderated_at: new Date().toISOString(),
              },
            })
            .eq('id', report.content_id);
        } else if (report.content_type === 'memory') {
          await fastify.supabase
            .from('memories')
            .update({
              approved: false,
              metadata: {
                ...report.metadata,
                moderated: true,
                moderated_by: reviewerId,
                moderated_at: new Date().toISOString(),
              },
            })
            .eq('id', report.content_id);
        }
        break;

      case 'account_suspension':
        if (report.content_type === 'user') {
          // Revoke all pairings for the user
          await fastify.supabase
            .from('pairings')
            .update({
              status: 'revoked',
              revoked_at: new Date().toISOString(),
            })
            .or(`student_id.eq.${report.content_id},parent_id.eq.${report.content_id}`);

          // Mark profile as suspended
          await fastify.supabase
            .from('profiles')
            .update({
              metadata: {
                suspended: true,
                suspended_by: reviewerId,
                suspended_at: new Date().toISOString(),
                suspension_reason: `Report: ${report.reason}`,
              },
            })
            .eq('id', report.content_id);
        }
        break;

      case 'warning':
        // Send warning notification to the reported user
        // This would integrate with the notification system
        logger.info('Warning issued', {
          reportId: report.id,
          targetUserId: report.content_id,
          issuedBy: reviewerId,
        });
        break;
    }
  } catch (error) {
    logger.error('Error taking report action:', error);
  }
}

