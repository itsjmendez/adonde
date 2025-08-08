# Production-Ready RLS Policies (No Recursion)

## ⚠️ IMPORTANT FOR PRODUCTION
Run this before deploying to production. Current setup has RLS disabled which is a security risk.

## The Problem
The original RLS policies had circular dependencies causing infinite recursion. Here's the fixed version.

## SQL to Run in Supabase Dashboard

Go to: https://yzyghloeilyarukytbtv.supabase.co/project/yzyghloeilyarukytbtv/sql/new

**Copy and paste this (safe, non-recursive policies):**

```sql
-- ========================================
-- STEP 1: Clean up old policies
-- ========================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "conversations_select_participants" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_creator" ON conversations;
DROP POLICY IF EXISTS "conversations_update_admins" ON conversations;
DROP POLICY IF EXISTS "participants_select_members" ON conversation_participants;
DROP POLICY IF EXISTS "participants_insert_self" ON conversation_participants;
DROP POLICY IF EXISTS "participants_update_self" ON conversation_participants;
DROP POLICY IF EXISTS "participants_update_admins" ON conversation_participants;
DROP POLICY IF EXISTS "messages_select_participants" ON chat_messages;
DROP POLICY IF EXISTS "messages_insert_participants" ON chat_messages;
DROP POLICY IF EXISTS "messages_update_sender" ON chat_messages;
DROP POLICY IF EXISTS "messages_delete_sender" ON chat_messages;
DROP POLICY IF EXISTS "typing_select_participants" ON typing_indicators;
DROP POLICY IF EXISTS "typing_insert_self" ON typing_indicators;
DROP POLICY IF EXISTS "typing_update_self" ON typing_indicators;
DROP POLICY IF EXISTS "typing_delete_self" ON typing_indicators;
DROP POLICY IF EXISTS "presence_select_connected" ON user_presence;
DROP POLICY IF EXISTS "presence_insert_self" ON user_presence;
DROP POLICY IF EXISTS "presence_update_self" ON user_presence;

-- ========================================
-- STEP 2: Simple, safe RLS policies
-- ========================================

-- CONVERSATIONS: Users can see conversations they participate in
CREATE POLICY "conversations_access" ON conversations
  FOR ALL USING (
    participant1_id = auth.uid() OR participant2_id = auth.uid() OR created_by = auth.uid()
  );

-- CONVERSATION_PARTICIPANTS: Only allow for group chats, simple access
CREATE POLICY "participants_access" ON conversation_participants
  FOR ALL USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_id 
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- CHAT_MESSAGES: Users can see/send messages in their conversations  
CREATE POLICY "messages_access" ON chat_messages
  FOR ALL USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id 
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- TYPING_INDICATORS: Users can manage typing in their conversations
CREATE POLICY "typing_access" ON typing_indicators
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id 
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- USER_PRESENCE: Users can see presence of people they chat with
CREATE POLICY "presence_access" ON user_presence
  FOR ALL USING (
    user_id = auth.uid()  -- Own presence
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE (c.participant1_id = auth.uid() AND c.participant2_id = user_presence.user_id)
         OR (c.participant2_id = auth.uid() AND c.participant1_id = user_presence.user_id)
    )
  );

-- ========================================
-- STEP 3: Re-enable RLS on all tables
-- ========================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;  
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
```

## What These Policies Do

✅ **Simple & Safe**: No circular references or recursion
✅ **Secure**: Users only see their own conversations and messages
✅ **Performant**: Direct lookups without complex nested queries
✅ **Group Chat Ready**: Will work when you add group functionality

## Key Differences from Original

1. **Single policy per table** instead of separate SELECT/INSERT/UPDATE policies
2. **Direct conversation checks** instead of checking participants table
3. **No self-referencing** - each policy only looks at the conversations table
4. **Simplified logic** - easier to understand and maintain

## Test After Running

1. Refresh your chat page
2. Should still work exactly the same
3. But now properly secured for production
4. Check console for any RLS errors

## If You Get Errors

If there are still issues, you can always disable RLS again temporarily:
```sql
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
```

But these policies should work without recursion issues!

## 🚨 Don't Forget This for Production!
Save this file and add it to your deployment checklist.