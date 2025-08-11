import { FastifyInstance } from 'fastify';
import { 
  CreatePairingRequestSchema, 
  AcceptPairingRequestSchema, 
  RevokePairingRequestSchema 
} from '@awy/schema';
import { logger } from '@awy/utils';
import { v4 as uuidv4 } from 'uuid';

export async function pairingRoutes(fastify: FastifyInstance) {
  
  // Create pairing invitation
  fastify.post('/invite', async (request, reply) => {
    try {
      const body = CreatePairingRequestSchema.parse(request.body);
      const user = request.user!;

      // Check if user has permission to create pairings
      if (user.userType !== 'admin' && user.userType !== 'parent') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Only parents and admins can create pairing invitations',
        });
        return;
      }

      // Find student and parent profiles
      const { data: studentProfile, error: studentError } = await fastify.supabase
        .from('profiles')
        .select('*')
        .eq('email', body.studentEmail)
        .eq('org_id', body.orgId)
        .eq('user_type', 'student')
        .single();

      if (studentError || !studentProfile) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Student not found in organization',
        });
        return;
      }

      const { data: parentProfile, error: parentError } = await fastify.supabase
        .from('profiles')
        .select('*')
        .eq('email', body.parentEmail)
        .eq('org_id', body.orgId)
        .eq('user_type', 'parent')
        .single();

      if (parentError || !parentProfile) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Parent not found in organization',
        });
        return;
      }

      // Check if pairing already exists
      const { data: existingPairing } = await fastify.supabase
        .from('pairings')
        .select('*')
        .eq('student_id', studentProfile.id)
        .eq('parent_id', parentProfile.id)
        .single();

      if (existingPairing) {
        reply.code(409).send({
          error: 'Conflict',
          message: 'Pairing already exists between these users',
        });
        return;
      }

      // Create pairing
      const pairingId = uuidv4();
      const { data: pairing, error: pairingError } = await fastify.supabase
        .from('pairings')
        .insert({
          id: pairingId,
          org_id: body.orgId,
          student_id: studentProfile.id,
          parent_id: parentProfile.id,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (pairingError) {
        logger.error('Error creating pairing:', pairingError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create pairing',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: body.orgId,
        user_id: user.id,
        pairing_id: pairingId,
        event_type: 'pairing_invited',
        event_data: {
          student_email: body.studentEmail,
          parent_email: body.parentEmail,
        },
      });

      logger.info('Pairing invitation created', {
        pairingId,
        studentId: studentProfile.id,
        parentId: parentProfile.id,
        invitedBy: user.id,
      });

      reply.send({
        success: true,
        data: pairing,
      });
    } catch (error) {
      logger.error('Error in pairing invitation:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process pairing invitation',
      });
    }
  });

  // Accept pairing invitation
  fastify.post('/accept', async (request, reply) => {
    try {
      const body = AcceptPairingRequestSchema.parse(request.body);
      const user = request.user!;

      // Get pairing
      const { data: pairing, error: pairingError } = await fastify.supabase
        .from('pairings')
        .select('*')
        .eq('id', body.pairingId)
        .single();

      if (pairingError || !pairing) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Pairing not found',
        });
        return;
      }

      // Check if user is part of the pairing
      if (pairing.student_id !== user.id && pairing.parent_id !== user.id) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'You are not part of this pairing',
        });
        return;
      }

      // Check if pairing is pending
      if (pairing.status !== 'pending') {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Pairing is not in pending status',
        });
        return;
      }

      // Accept pairing
      const { data: updatedPairing, error: updateError } = await fastify.supabase
        .from('pairings')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', body.pairingId)
        .select()
        .single();

      if (updateError) {
        logger.error('Error accepting pairing:', updateError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to accept pairing',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: pairing.org_id,
        user_id: user.id,
        pairing_id: body.pairingId,
        event_type: 'pairing_accepted',
        event_data: {
          accepted_by: user.userType,
        },
      });

      logger.info('Pairing accepted', {
        pairingId: body.pairingId,
        acceptedBy: user.id,
      });

      reply.send({
        success: true,
        data: updatedPairing,
      });
    } catch (error) {
      logger.error('Error accepting pairing:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to accept pairing',
      });
    }
  });

  // Revoke pairing
  fastify.post('/revoke', async (request, reply) => {
    try {
      const body = RevokePairingRequestSchema.parse(request.body);
      const user = request.user!;

      // Get pairing
      const { data: pairing, error: pairingError } = await fastify.supabase
        .from('pairings')
        .select('*')
        .eq('id', body.pairingId)
        .single();

      if (pairingError || !pairing) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Pairing not found',
        });
        return;
      }

      // Check permissions
      const canRevoke = user.userType === 'admin' || 
                       pairing.student_id === user.id || 
                       pairing.parent_id === user.id;

      if (!canRevoke) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to revoke this pairing',
        });
        return;
      }

      // Revoke pairing
      const { data: updatedPairing, error: updateError } = await fastify.supabase
        .from('pairings')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('id', body.pairingId)
        .select()
        .single();

      if (updateError) {
        logger.error('Error revoking pairing:', updateError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to revoke pairing',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: pairing.org_id,
        user_id: user.id,
        pairing_id: body.pairingId,
        event_type: 'pairing_revoked',
        event_data: {
          revoked_by: user.userType,
          reason: body.reason,
        },
      });

      logger.info('Pairing revoked', {
        pairingId: body.pairingId,
        revokedBy: user.id,
        reason: body.reason,
      });

      reply.send({
        success: true,
        data: updatedPairing,
      });
    } catch (error) {
      logger.error('Error revoking pairing:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to revoke pairing',
      });
    }
  });

  // Get user's pairings
  fastify.get('/', async (request, reply) => {
    try {
      const user = request.user!;

      const { data: pairings, error } = await fastify.supabase
        .from('pairings')
        .select(`
          *,
          student:profiles!pairings_student_id_fkey(id, full_name, email, avatar_url),
          parent:profiles!pairings_parent_id_fkey(id, full_name, email, avatar_url)
        `)
        .or(`student_id.eq.${user.id},parent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching pairings:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch pairings',
        });
        return;
      }

      reply.send({
        success: true,
        data: pairings,
      });
    } catch (error) {
      logger.error('Error fetching pairings:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch pairings',
      });
    }
  });
}

