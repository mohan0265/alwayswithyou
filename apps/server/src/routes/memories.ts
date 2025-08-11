import { FastifyInstance } from 'fastify';
import { 
  UploadMemoryRequestSchema, 
  ApproveMemoryRequestSchema 
} from '@awy/schema';
import { logger } from '@awy/utils';
import { v4 as uuidv4 } from 'uuid';

export async function memoriesRoutes(fastify: FastifyInstance) {
  
  // Get memories for user's pairings
  fastify.get('/', async (request, reply) => {
    try {
      const user = request.user!;
      const { page = 1, limit = 20, approved_only = 'true' } = request.query as any;
      
      const offset = (page - 1) * limit;
      const showApprovedOnly = approved_only === 'true';

      // Get user's pairings
      const { data: pairings } = await fastify.supabase
        .from('pairings')
        .select('id')
        .or(`student_id.eq.${user.id},parent_id.eq.${user.id}`)
        .eq('status', 'active');

      if (!pairings || pairings.length === 0) {
        reply.send({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
        return;
      }

      const pairingIds = pairings.map(p => p.id);

      // Build query
      let query = fastify.supabase
        .from('memories')
        .select(`
          *,
          album:albums(id, name, description),
          creator:profiles!memories_created_by_fkey(id, full_name, avatar_url),
          approver:profiles!memories_approved_by_fkey(id, full_name, avatar_url)
        `, { count: 'exact' })
        .in('pairing_id', pairingIds);

      if (showApprovedOnly) {
        query = query.eq('approved', true);
      } else if (user.userType !== 'admin') {
        // Non-admins can see their own memories + approved ones
        query = query.or(`approved.eq.true,created_by.eq.${user.id}`);
      }

      const { data: memories, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching memories:', error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch memories',
        });
        return;
      }

      const totalPages = Math.ceil((count || 0) / limit);

      reply.send({
        success: true,
        data: memories,
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
      logger.error('Error in memories route:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch memories',
      });
    }
  });

  // Upload new memory
  fastify.post('/upload', async (request, reply) => {
    try {
      const body = UploadMemoryRequestSchema.parse(request.body);
      const user = request.user!;

      // Verify album exists and user has access
      const { data: album, error: albumError } = await fastify.supabase
        .from('albums')
        .select('*, pairing:pairings(*)')
        .eq('id', body.albumId)
        .single();

      if (albumError || !album) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Album not found',
        });
        return;
      }

      // Check if user is part of the pairing
      const pairing = album.pairing;
      if (!pairing || (pairing.student_id !== user.id && pairing.parent_id !== user.id)) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this album',
        });
        return;
      }

      // TODO: Process image upload to storage
      // For now, we'll use the provided imageData as a placeholder URL
      const imageUrl = `https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=Memory+${Date.now()}`;
      const thumbnailUrl = `https://via.placeholder.com/200x150/4F46E5/FFFFFF?text=Memory+${Date.now()}`;

      // Create memory record
      const memoryId = uuidv4();
      const { data: memory, error: memoryError } = await fastify.supabase
        .from('memories')
        .insert({
          id: memoryId,
          album_id: body.albumId,
          pairing_id: pairing.id,
          title: body.title,
          caption: body.caption,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          approved: false, // Requires approval
          created_by: user.id,
        })
        .select(`
          *,
          album:albums(id, name),
          creator:profiles!memories_created_by_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (memoryError) {
        logger.error('Error creating memory:', memoryError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to upload memory',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        pairing_id: pairing.id,
        event_type: 'memory_uploaded',
        event_data: {
          memory_id: memoryId,
          album_id: body.albumId,
          has_title: !!body.title,
          has_caption: !!body.caption,
        },
      });

      logger.info('Memory uploaded', {
        memoryId,
        albumId: body.albumId,
        uploadedBy: user.id,
      });

      reply.send({
        success: true,
        data: memory,
      });
    } catch (error) {
      logger.error('Error uploading memory:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload memory',
      });
    }
  });

  // Approve/reject memory (admin only)
  fastify.post('/approve/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = ApproveMemoryRequestSchema.parse(request.body);
      const user = request.user!;

      // Only admins can approve memories
      if (user.userType !== 'admin') {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can approve memories',
        });
        return;
      }

      // Get memory
      const { data: memory, error: memoryError } = await fastify.supabase
        .from('memories')
        .select('*')
        .eq('id', id)
        .single();

      if (memoryError || !memory) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Memory not found',
        });
        return;
      }

      // Update memory approval status
      const updateData: any = {
        approved: body.approved,
        approved_by: body.approved ? user.id : null,
        approved_at: body.approved ? new Date().toISOString() : null,
      };

      const { data: updatedMemory, error: updateError } = await fastify.supabase
        .from('memories')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          album:albums(id, name),
          creator:profiles!memories_created_by_fkey(id, full_name, avatar_url),
          approver:profiles!memories_approved_by_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (updateError) {
        logger.error('Error updating memory approval:', updateError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update memory approval',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: body.approved ? 'memory_approved' : 'memory_rejected',
        event_data: {
          memory_id: id,
          approved_by: user.id,
        },
      });

      logger.info('Memory approval updated', {
        memoryId: id,
        approved: body.approved,
        approvedBy: user.id,
      });

      reply.send({
        success: true,
        data: updatedMemory,
      });
    } catch (error) {
      logger.error('Error updating memory approval:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update memory approval',
      });
    }
  });

  // Get memory by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const { data: memory, error } = await fastify.supabase
        .from('memories')
        .select(`
          *,
          album:albums(id, name, description),
          creator:profiles!memories_created_by_fkey(id, full_name, avatar_url),
          approver:profiles!memories_approved_by_fkey(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error || !memory) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Memory not found',
        });
        return;
      }

      // Check access permissions
      const hasAccess = user.userType === 'admin' || 
                       memory.created_by === user.id ||
                       (memory.approved && await userHasAccessToPairing(user.id, memory.pairing_id, fastify));

      if (!hasAccess) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this memory',
        });
        return;
      }

      reply.send({
        success: true,
        data: memory,
      });
    } catch (error) {
      logger.error('Error fetching memory:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch memory',
      });
    }
  });

  // Delete memory
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user!;

      // Get memory
      const { data: memory, error: memoryError } = await fastify.supabase
        .from('memories')
        .select('*')
        .eq('id', id)
        .single();

      if (memoryError || !memory) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Memory not found',
        });
        return;
      }

      // Check permissions (admin or creator)
      if (user.userType !== 'admin' && memory.created_by !== user.id) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'You can only delete your own memories',
        });
        return;
      }

      // Delete memory
      const { error: deleteError } = await fastify.supabase
        .from('memories')
        .delete()
        .eq('id', id);

      if (deleteError) {
        logger.error('Error deleting memory:', deleteError);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete memory',
        });
        return;
      }

      // Log event
      await fastify.supabase.from('events').insert({
        org_id: user.orgId,
        user_id: user.id,
        event_type: 'memory_deleted',
        event_data: {
          memory_id: id,
          deleted_by: user.id,
        },
      });

      logger.info('Memory deleted', {
        memoryId: id,
        deletedBy: user.id,
      });

      reply.send({
        success: true,
        message: 'Memory deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting memory:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete memory',
      });
    }
  });
}

async function userHasAccessToPairing(userId: string, pairingId: string, fastify: FastifyInstance): Promise<boolean> {
  const { data: pairing } = await fastify.supabase
    .from('pairings')
    .select('student_id, parent_id')
    .eq('id', pairingId)
    .eq('status', 'active')
    .single();

  return pairing && (pairing.student_id === userId || pairing.parent_id === userId);
}

