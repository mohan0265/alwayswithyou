-- Row Level Security (RLS) Policies for AWY
-- Ensures privacy by design and prevents cross-pair data leakage

-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's profile
CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS profiles AS $$
DECLARE
    profile profiles;
BEGIN
    SELECT * INTO profile FROM profiles WHERE auth_user_id = auth.uid();
    RETURN profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is in a pairing
CREATE OR REPLACE FUNCTION is_in_pairing(pairing_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_profile profiles;
BEGIN
    current_profile := get_current_profile();
    RETURN EXISTS (
        SELECT 1 FROM pairings 
        WHERE id = pairing_uuid 
        AND (student_id = current_profile.id OR parent_id = current_profile.id)
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_profile profiles;
BEGIN
    current_profile := get_current_profile();
    RETURN current_profile.user_type = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get paired partner ID
CREATE OR REPLACE FUNCTION get_paired_partner_id()
RETURNS UUID AS $$
DECLARE
    current_profile profiles;
    partner_id UUID;
BEGIN
    current_profile := get_current_profile();
    
    -- If student, get parent
    IF current_profile.user_type = 'student' THEN
        SELECT parent_id INTO partner_id FROM pairings 
        WHERE student_id = current_profile.id AND status = 'active' LIMIT 1;
    -- If parent, get student
    ELSIF current_profile.user_type = 'parent' THEN
        SELECT student_id INTO partner_id FROM pairings 
        WHERE parent_id = current_profile.id AND status = 'active' LIMIT 1;
    END IF;
    
    RETURN partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their org" ON orgs
    FOR SELECT USING (
        id IN (SELECT org_id FROM profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Admins can manage orgs" ON orgs
    FOR ALL USING (is_admin());

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can view paired partner profile" ON profiles
    FOR SELECT USING (
        id = get_paired_partner_id()
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can manage profiles" ON profiles
    FOR ALL USING (is_admin());

-- Pairings policies
CREATE POLICY "Users can view their pairings" ON pairings
    FOR SELECT USING (
        student_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        parent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

CREATE POLICY "Users can create pairings they're part of" ON pairings
    FOR INSERT WITH CHECK (
        student_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        parent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

CREATE POLICY "Users can update their pairings" ON pairings
    FOR UPDATE USING (
        student_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        parent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

-- Presence policies
CREATE POLICY "Users can view their own presence" ON presence
    FOR SELECT USING (
        user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can view paired partner presence with visibility check" ON presence
    FOR SELECT USING (
        user_id = get_paired_partner_id() AND
        (
            -- Parents are always visible to students when online
            (SELECT user_type FROM profiles WHERE id = user_id) = 'parent' OR
            -- Students are visible to parents only if they allow it
            (
                (SELECT user_type FROM profiles WHERE id = user_id) = 'student' AND
                (SELECT visible_to_partner FROM profiles WHERE id = user_id) = true
            )
        )
    );

CREATE POLICY "Users can update their own presence" ON presence
    FOR ALL USING (
        user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

-- Messages policies
CREATE POLICY "Users can view messages in their pairings" ON messages
    FOR SELECT USING (
        is_in_pairing(pairing_id)
    );

CREATE POLICY "Users can send messages in their pairings" ON messages
    FOR INSERT WITH CHECK (
        sender_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) AND
        is_in_pairing(pairing_id)
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (
        sender_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

-- Calls policies
CREATE POLICY "Users can view calls in their pairings" ON calls
    FOR SELECT USING (
        is_in_pairing(pairing_id)
    );

CREATE POLICY "Users can create calls in their pairings" ON calls
    FOR INSERT WITH CHECK (
        caller_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) AND
        is_in_pairing(pairing_id)
    );

CREATE POLICY "Users can update calls they're part of" ON calls
    FOR UPDATE USING (
        caller_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        callee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

-- Albums policies
CREATE POLICY "Users can view albums in their org" ON albums
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

CREATE POLICY "Users can create albums in their org" ON albums
    FOR INSERT WITH CHECK (
        created_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) AND
        org_id IN (SELECT org_id FROM profiles WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Users can update their own albums" ON albums
    FOR UPDATE USING (
        created_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

-- Memories policies
CREATE POLICY "Users can view approved memories in their pairings" ON memories
    FOR SELECT USING (
        (approved = true AND is_in_pairing(pairing_id)) OR
        created_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

CREATE POLICY "Users can create memories in their pairings" ON memories
    FOR INSERT WITH CHECK (
        created_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) AND
        is_in_pairing(pairing_id)
    );

CREATE POLICY "Users can update their own memories" ON memories
    FOR UPDATE USING (
        created_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
        is_admin()
    );

-- Events policies (admin only for security)
CREATE POLICY "Admins can view all events" ON events
    FOR SELECT USING (is_admin());

CREATE POLICY "System can insert events" ON events
    FOR INSERT WITH CHECK (true); -- Allow system inserts

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role for server operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

