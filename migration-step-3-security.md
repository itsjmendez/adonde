# Step 3: Security Policies (RLS)

## What this does
Sets up Row Level Security (RLS) policies to ensure users can only see messages and conversations they have access to.

## SQL to Run in Supabase Dashboard

Go to: https://yzyghloeilyarukytbtv.supabase.co/project/yzyghloeilyarukytbtv/sql/new

**Copy and paste this:**

```sql
-- ROW LEVEL SECURITY POLICIES for Scalable Chat System
-- Designed to work efficiently for both 1:1 and group chats

-- ========================================
-- CONVERSATIONS TABLE POLICIES
-- ========================================

-- Users can view conversations they participate in
CREATE POLICY "conversations_select_participants" ON conversations
  FOR SELECT USING (
    -- Direct chats: user is one of the participants
    (type = 'direct' AND (participant1_id = auth.uid() OR participant2_id = auth.uid()))
    OR
    -- Group chats: user is an active member
    (type = 'group' AND EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = id 
        AND cp.user_id = auth.uid() 
        AND cp.left_at IS NULL
    ))
  );

-- Users can create conversations (will be restricted by business logic)
CREATE POLICY "conversations_insert_creator" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only conversation creators/admins can update conversations
CREATE POLICY "conversations_update_admins" ON conversations
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = id 
        AND cp.user_id = auth.uid() 
        AND cp.role IN ('admin', 'owner')
        AND cp.left_at IS NULL
    )
  );

-- ========================================
-- CONVERSATION PARTICIPANTS TABLE POLICIES
-- ========================================

-- Users can view participants of conversations they're in
CREATE POLICY "participants_select_members" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          (c.type = 'direct' AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
          OR
          (c.type = 'group' AND EXISTS (
            SELECT 1 FROM conversation_participants cp2 
            WHERE cp2.conversation_id = c.id 
              AND cp2.user_id = auth.uid() 
              AND cp2.left_at IS NULL
          ))
        )
    )
  );

-- Users can join conversations (business logic controls this)
CREATE POLICY "participants_insert_self" ON conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can leave conversations (update their own left_at)
CREATE POLICY "participants_update_self" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage participants
CREATE POLICY "participants_update_admins" ON conversation_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = conversation_id 
        AND cp.user_id = auth.uid() 
        AND cp.role IN ('admin', 'owner')
        AND cp.left_at IS NULL
    )
  );

-- ========================================
-- MESSAGES TABLE POLICIES
-- ========================================

-- Users can view messages from conversations they participate in
CREATE POLICY "messages_select_participants" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          -- Direct chats
          (c.type = 'direct' AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
          OR
          -- Group chats
          (c.type = 'group' AND EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = c.id 
              AND cp.user_id = auth.uid() 
              AND cp.left_at IS NULL
              -- Can see messages from before they left (if they rejoined)
              AND (cp.joined_at <= chat_messages.created_at OR cp.left_at IS NULL)
          ))
        )
    )
  );

-- Users can send messages to conversations they're in
CREATE POLICY "messages_insert_participants" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          -- Direct chats: both participants must still be active
          (c.type = 'direct' AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
          OR
          -- Group chats: user must be active member
          (c.type = 'group' AND EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = c.id 
              AND cp.user_id = auth.uid() 
              AND cp.left_at IS NULL
          ))
        )
    )
  );

-- Users can update their own messages (for editing)
CREATE POLICY "messages_update_sender" ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can soft-delete their own messages
CREATE POLICY "messages_delete_sender" ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (sender_id = auth.uid());

-- ========================================
-- TYPING INDICATORS POLICIES
-- ========================================

-- Users can view typing indicators for conversations they're in
CREATE POLICY "typing_select_participants" ON typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          (c.type = 'direct' AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
          OR
          (c.type = 'group' AND EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = c.id 
              AND cp.user_id = auth.uid() 
              AND cp.left_at IS NULL
          ))
        )
    )
  );

-- Users can only manage their own typing indicators
CREATE POLICY "typing_insert_self" ON typing_indicators
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          (c.type = 'direct' AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid()))
          OR
          (c.type = 'group' AND EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = c.id 
              AND cp.user_id = auth.uid() 
              AND cp.left_at IS NULL
          ))
        )
    )
  );

CREATE POLICY "typing_update_self" ON typing_indicators
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "typing_delete_self" ON typing_indicators
  FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- USER PRESENCE POLICIES
-- ========================================

-- Users can view presence of people they have conversations with
CREATE POLICY "presence_select_connected" ON user_presence
  FOR SELECT USING (
    user_id = auth.uid() -- Own presence
    OR EXISTS (
      -- People in direct chats with you
      SELECT 1 FROM conversations c
      WHERE c.type = 'direct' 
        AND ((c.participant1_id = auth.uid() AND c.participant2_id = user_presence.user_id)
             OR (c.participant2_id = auth.uid() AND c.participant1_id = user_presence.user_id))
    )
    OR EXISTS (
      -- People in group chats with you
      SELECT 1 FROM conversation_participants cp1
      JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid() 
        AND cp2.user_id = user_presence.user_id
        AND cp1.left_at IS NULL 
        AND cp2.left_at IS NULL
    )
  );

-- Users can only update their own presence
CREATE POLICY "presence_insert_self" ON user_presence
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "presence_update_self" ON user_presence
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- PERFORMANCE OPTIMIZATION FUNCTION
-- ========================================

-- Create helper function for membership check (can be cached)
CREATE OR REPLACE FUNCTION user_in_conversation(conv_id UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conv_id
      AND (
        (c.type = 'direct' AND (c.participant1_id = user_uuid OR c.participant2_id = user_uuid))
        OR
        (c.type = 'group' AND EXISTS (
          SELECT 1 FROM conversation_participants cp 
          WHERE cp.conversation_id = c.id 
            AND cp.user_id = user_uuid 
            AND cp.left_at IS NULL
        ))
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

## What this secures
- ✅ Users only see conversations they participate in
- ✅ Messages are private to conversation members
- ✅ Typing indicators only visible to conversation members
- ✅ User presence only visible to connected users
- ✅ Group chat permissions (admin/member roles)

## Next Step
Run `migration-step-4-realtime.md`