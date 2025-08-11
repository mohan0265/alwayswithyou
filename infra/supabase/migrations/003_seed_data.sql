-- Seed data for AWY development and testing
-- Creates demo org, users, pairing, and sample content

-- Insert demo organization
INSERT INTO orgs (id, name, slug, logo_url, brand_colors, quick_texts, policies) VALUES (
    'demo-org-uuid-1234-5678-9012-123456789012',
    'Demo University',
    'demo',
    'https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=DU',
    '{
        "primary": "#4F46E5",
        "secondary": "#EC4899",
        "accent": "#10B981",
        "background": "#FFFFFF",
        "text": "#1F2937"
    }',
    ARRAY[
        'Are you online? Can we talk?',
        'I''m studying, can we chat after 10 pm?',
        'Miss you! ❤️',
        'How was your day?',
        'Thinking of you 💕',
        'Can''t wait to see you!',
        'Love you so much!',
        'Hope you''re doing well',
        'Sweet dreams! 🌙',
        'Good morning sunshine! ☀️'
    ],
    '{
        "defaultVisibility": true,
        "quietHours": {
            "enabled": true,
            "start": "19:00",
            "end": "23:00",
            "days": [1, 2, 3, 4, 5]
        },
        "flashbackCap": 3,
        "dndRespected": true
    }'
) ON CONFLICT (id) DO NOTHING;

-- Insert demo student (Alice)
INSERT INTO profiles (id, org_id, email, full_name, avatar_url, user_type, timezone, visible_to_partner, quiet_hours) VALUES (
    'alice-student-uuid-1234-5678-9012-123456789012',
    'demo-org-uuid-1234-5678-9012-123456789012',
    'alice.student@demo.edu',
    'Alice Johnson',
    'https://via.placeholder.com/150x150/EC4899/FFFFFF?text=AJ',
    'student',
    'America/New_York',
    true,
    '{
        "enabled": true,
        "start": "19:00",
        "end": "23:00",
        "days": [1, 2, 3, 4, 5],
        "timezone": "America/New_York"
    }'
) ON CONFLICT (id) DO NOTHING;

-- Insert demo parent (Maria)
INSERT INTO profiles (id, org_id, email, full_name, avatar_url, user_type, timezone) VALUES (
    'maria-parent-uuid-1234-5678-9012-123456789012',
    'demo-org-uuid-1234-5678-9012-123456789012',
    'maria.johnson@email.com',
    'Maria Johnson',
    'https://via.placeholder.com/150x150/10B981/FFFFFF?text=MJ',
    'parent',
    'America/New_York'
) ON CONFLICT (id) DO NOTHING;

-- Insert demo admin
INSERT INTO profiles (id, org_id, email, full_name, avatar_url, user_type, timezone) VALUES (
    'admin-user-uuid-1234-5678-9012-123456789012',
    'demo-org-uuid-1234-5678-9012-123456789012',
    'admin@demo.edu',
    'Demo Admin',
    'https://via.placeholder.com/150x150/4F46E5/FFFFFF?text=DA',
    'admin',
    'America/New_York'
) ON CONFLICT (id) DO NOTHING;

-- Create active pairing between Alice and Maria
INSERT INTO pairings (id, org_id, student_id, parent_id, status, invited_by, invited_at, accepted_at) VALUES (
    'demo-pairing-uuid-1234-5678-9012-123456789012',
    'demo-org-uuid-1234-5678-9012-123456789012',
    'alice-student-uuid-1234-5678-9012-123456789012',
    'maria-parent-uuid-1234-5678-9012-123456789012',
    'active',
    'maria-parent-uuid-1234-5678-9012-123456789012',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '6 days'
) ON CONFLICT (id) DO NOTHING;

-- Insert presence data
INSERT INTO presence (user_id, status, last_heartbeat) VALUES 
    ('alice-student-uuid-1234-5678-9012-123456789012', 'online', NOW()),
    ('maria-parent-uuid-1234-5678-9012-123456789012', 'online', NOW())
ON CONFLICT (user_id) DO UPDATE SET 
    status = EXCLUDED.status,
    last_heartbeat = EXCLUDED.last_heartbeat;

-- Create sample album
INSERT INTO albums (id, org_id, pairing_id, name, description, cover_image_url, is_public, created_by) VALUES (
    'demo-album-uuid-1234-5678-9012-123456789012',
    'demo-org-uuid-1234-5678-9012-123456789012',
    'demo-pairing-uuid-1234-5678-9012-123456789012',
    'Family Memories',
    'Beautiful moments we''ve shared together',
    'https://via.placeholder.com/400x300/EC4899/FFFFFF?text=Family+Memories',
    true,
    'maria-parent-uuid-1234-5678-9012-123456789012'
) ON CONFLICT (id) DO NOTHING;

-- Insert 6 approved sample memories
INSERT INTO memories (id, album_id, pairing_id, title, caption, image_url, thumbnail_url, approved, approved_by, approved_at, created_by) VALUES 
    (
        'memory-1-uuid-1234-5678-9012-123456789012',
        'demo-album-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'First Day of College',
        'Alice''s first day at Demo University. So proud of you! 💕',
        'https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=First+Day',
        'https://via.placeholder.com/200x150/4F46E5/FFFFFF?text=First+Day',
        true,
        'admin-user-uuid-1234-5678-9012-123456789012',
        NOW() - INTERVAL '5 days',
        'maria-parent-uuid-1234-5678-9012-123456789012'
    ),
    (
        'memory-2-uuid-1234-5678-9012-123456789012',
        'demo-album-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'Family Vacation',
        'Our last vacation together before college. Missing these moments! 🏖️',
        'https://via.placeholder.com/600x400/10B981/FFFFFF?text=Vacation',
        'https://via.placeholder.com/200x150/10B981/FFFFFF?text=Vacation',
        true,
        'admin-user-uuid-1234-5678-9012-123456789012',
        NOW() - INTERVAL '4 days',
        'maria-parent-uuid-1234-5678-9012-123456789012'
    ),
    (
        'memory-3-uuid-1234-5678-9012-123456789012',
        'demo-album-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'Graduation Day',
        'High school graduation - the beginning of a new chapter! 🎓',
        'https://via.placeholder.com/600x400/EC4899/FFFFFF?text=Graduation',
        'https://via.placeholder.com/200x150/EC4899/FFFFFF?text=Graduation',
        true,
        'admin-user-uuid-1234-5678-9012-123456789012',
        NOW() - INTERVAL '3 days',
        'maria-parent-uuid-1234-5678-9012-123456789012'
    ),
    (
        'memory-4-uuid-1234-5678-9012-123456789012',
        'demo-album-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'Birthday Celebration',
        'Alice''s 18th birthday party. Time flies so fast! 🎂',
        'https://via.placeholder.com/600x400/F59E0B/FFFFFF?text=Birthday',
        'https://via.placeholder.com/200x150/F59E0B/FFFFFF?text=Birthday',
        true,
        'admin-user-uuid-1234-5678-9012-123456789012',
        NOW() - INTERVAL '2 days',
        'maria-parent-uuid-1234-5678-9012-123456789012'
    ),
    (
        'memory-5-uuid-1234-5678-9012-123456789012',
        'demo-album-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'Study Session',
        'Alice studying hard for finals. So dedicated! 📚',
        'https://via.placeholder.com/600x400/8B5CF6/FFFFFF?text=Study+Time',
        'https://via.placeholder.com/200x150/8B5CF6/FFFFFF?text=Study+Time',
        true,
        'admin-user-uuid-1234-5678-9012-123456789012',
        NOW() - INTERVAL '1 day',
        'alice-student-uuid-1234-5678-9012-123456789012'
    ),
    (
        'memory-6-uuid-1234-5678-9012-123456789012',
        'demo-album-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'Video Call',
        'Our daily check-in call. Love staying connected! 💖',
        'https://via.placeholder.com/600x400/EF4444/FFFFFF?text=Video+Call',
        'https://via.placeholder.com/200x150/EF4444/FFFFFF?text=Video+Call',
        true,
        'admin-user-uuid-1234-5678-9012-123456789012',
        NOW(),
        'alice-student-uuid-1234-5678-9012-123456789012'
    )
ON CONFLICT (id) DO NOTHING;

-- Insert some sample messages
INSERT INTO messages (pairing_id, sender_id, content, message_type) VALUES 
    (
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'maria-parent-uuid-1234-5678-9012-123456789012',
        'Good morning sweetie! How did you sleep?',
        'text'
    ),
    (
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'alice-student-uuid-1234-5678-9012-123456789012',
        'Morning Mom! Slept well, thanks. Getting ready for my morning class.',
        'text'
    ),
    (
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'maria-parent-uuid-1234-5678-9012-123456789012',
        'Are you online? Can we talk?',
        'quick_text'
    ),
    (
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'alice-student-uuid-1234-5678-9012-123456789012',
        'I''m studying, can we chat after 10 pm?',
        'quick_text'
    );

-- Insert sample call log
INSERT INTO calls (pairing_id, caller_id, callee_id, call_type, status, started_at, connected_at, ended_at, duration_seconds) VALUES (
    'demo-pairing-uuid-1234-5678-9012-123456789012',
    'maria-parent-uuid-1234-5678-9012-123456789012',
    'alice-student-uuid-1234-5678-9012-123456789012',
    'video',
    'ended',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours' + INTERVAL '5 seconds',
    NOW() - INTERVAL '1 hour 45 minutes',
    900
);

-- Insert some system events
INSERT INTO events (org_id, user_id, pairing_id, event_type, event_data) VALUES 
    (
        'demo-org-uuid-1234-5678-9012-123456789012',
        'maria-parent-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'pairing_created',
        '{"action": "invite_sent", "target_user": "alice-student-uuid-1234-5678-9012-123456789012"}'
    ),
    (
        'demo-org-uuid-1234-5678-9012-123456789012',
        'alice-student-uuid-1234-5678-9012-123456789012',
        'demo-pairing-uuid-1234-5678-9012-123456789012',
        'pairing_accepted',
        '{"action": "invite_accepted", "inviter": "maria-parent-uuid-1234-5678-9012-123456789012"}'
    ),
    (
        'demo-org-uuid-1234-5678-9012-123456789012',
        'alice-student-uuid-1234-5678-9012-123456789012',
        NULL,
        'user_login',
        '{"login_method": "email", "ip_address": "127.0.0.1"}'
    );

