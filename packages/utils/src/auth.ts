import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  userType: 'student' | 'parent' | 'admin';
  timezone: string;
}

export interface AuthConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
}

export class AuthService {
  private supabase: SupabaseClient;
  private jwtSecret: string;

  constructor(config: AuthConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
    this.jwtSecret = config.jwtSecret;
  }

  /**
   * Verify JWT token and extract user information
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Get user profile from database
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', decoded.sub)
        .single();

      if (error || !profile) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        orgId: profile.org_id,
        userType: profile.user_type,
        timezone: profile.timezone,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(authUserId: string, userData: {
    orgId: string;
    email: string;
    fullName: string;
    userType: 'student' | 'parent' | 'admin';
    timezone?: string;
    avatarUrl?: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .insert({
          auth_user_id: authUserId,
          org_id: userData.orgId,
          email: userData.email,
          full_name: userData.fullName,
          user_type: userData.userType,
          timezone: userData.timezone || 'UTC',
          avatar_url: userData.avatarUrl,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Record<string, any>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Check if user has permission for a specific action
   */
  async hasPermission(userId: string, action: string, resourceId?: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) return false;

      // Admin has all permissions
      if (profile.user_type === 'admin') {
        return true;
      }

      // Implement specific permission logic based on action
      switch (action) {
        case 'read_pairing':
        case 'update_pairing':
          if (resourceId) {
            const { data: pairing } = await this.supabase
              .from('pairings')
              .select('student_id, parent_id')
              .eq('id', resourceId)
              .single();
            
            return !!(pairing && (pairing.student_id === userId || pairing.parent_id === userId));
          }
          return false;

        case 'send_message':
          if (resourceId) {
            const { data: pairing } = await this.supabase
              .from('pairings')
              .select('student_id, parent_id, status')
              .eq('id', resourceId)
              .single();
            
            return !!(pairing && 
                   pairing.status === 'active' && 
                   (pairing.student_id === userId || pairing.parent_id === userId));
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Generate service token for server-to-server communication
   */
  generateServiceToken(payload: Record<string, any>, expiresIn: string = '1h'): string {
    return jwt.sign({ ...payload, expiresIn }, this.jwtSecret);
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}



