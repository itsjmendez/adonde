# Step 2: Migration Functions

## What this does
Adds functions to migrate your existing messages to the new system and provide backward compatibility.

## SQL to Run in Supabase Dashboard

Go to: https://yzyghloeilyarukytbtv.supabase.co/project/yzyghloeilyarukytbtv/sql/new

**Copy and paste this:**

```sql
-- MIGRATION STRATEGY: From current messages table to scalable architecture
-- This allows you to migrate incrementally without breaking existing functionality

-- ========================================
-- PHASE 1: Data Migration Function
-- ========================================

CREATE OR REPLACE FUNCTION migrate_existing_messages()
RETURNS TABLE (
  migrated_conversations INTEGER,
  migrated_messages INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  conversation_count INTEGER := 0;
  message_count INTEGER := 0;
  error_list TEXT[] := '{}';
  connection_rec RECORD;
  new_conversation_id UUID;
BEGIN
  -- Step 1: Create conversations from existing connection_requests
  FOR connection_rec IN 
    SELECT DISTINCT 
      cr.id as connection_id,
      cr.sender_id,
      cr.receiver_id,
      cr.created_at
    FROM connection_requests cr
    WHERE cr.status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM messages m WHERE m.connection_id = cr.id
    )
  LOOP
    BEGIN
      -- Ensure participant1_id < participant2_id for consistency
      IF connection_rec.sender_id < connection_rec.receiver_id THEN
        INSERT INTO conversations (
          type,
          created_by,
          participant1_id,
          participant2_id,
          created_at,
          last_message_at
        ) VALUES (
          'direct',
          connection_rec.sender_id,
          connection_rec.sender_id,
          connection_rec.receiver_id,
          connection_rec.created_at,
          (SELECT MAX(created_at) FROM messages WHERE connection_id = connection_rec.connection_id)
        ) RETURNING id INTO new_conversation_id;
      ELSE
        INSERT INTO conversations (
          type,
          created_by,
          participant1_id,
          participant2_id,
          created_at,
          last_message_at
        ) VALUES (
          'direct',
          connection_rec.sender_id,
          connection_rec.receiver_id,
          connection_rec.sender_id,
          connection_rec.created_at,
          (SELECT MAX(created_at) FROM messages WHERE connection_id = connection_rec.connection_id)
        ) RETURNING id INTO new_conversation_id;
      END IF;

      -- Step 2: Migrate messages for this conversation
      INSERT INTO chat_messages (
        conversation_id,
        sender_id,
        content,
        created_at
      )
      SELECT 
        new_conversation_id,
        m.sender_id,
        m.content,
        m.created_at
      FROM messages m
      WHERE m.connection_id = connection_rec.connection_id;

      conversation_count := conversation_count + 1;
      
      -- Count messages migrated
      SELECT COUNT(*) INTO message_count 
      FROM messages WHERE connection_id = connection_rec.connection_id;
      
    EXCEPTION WHEN OTHERS THEN
      error_list := array_append(error_list, 
        'Error migrating connection ' || connection_rec.connection_id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT conversation_count, message_count, error_list;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PHASE 2: Compatibility Functions
-- ========================================

-- Function to find conversation by connection_request_id
CREATE OR REPLACE FUNCTION get_conversation_by_connection_id(connection_request_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  sender_id UUID;
  receiver_id UUID;
BEGIN
  -- Get the participants from the connection request
  SELECT cr.sender_id, cr.receiver_id 
  INTO sender_id, receiver_id
  FROM connection_requests cr 
  WHERE cr.id = connection_request_id;
  
  -- Find the conversation (ensuring consistent ordering)
  IF sender_id < receiver_id THEN
    SELECT c.id INTO conversation_id
    FROM conversations c
    WHERE c.participant1_id = sender_id 
      AND c.participant2_id = receiver_id
      AND c.type = 'direct';
  ELSE
    SELECT c.id INTO conversation_id
    FROM conversations c
    WHERE c.participant1_id = receiver_id 
      AND c.participant2_id = sender_id
      AND c.type = 'direct';
  END IF;
  
  -- If no conversation exists, create one
  IF conversation_id IS NULL THEN
    IF sender_id < receiver_id THEN
      INSERT INTO conversations (
        type, created_by, participant1_id, participant2_id
      ) VALUES (
        'direct', sender_id, sender_id, receiver_id
      ) RETURNING id INTO conversation_id;
    ELSE
      INSERT INTO conversations (
        type, created_by, participant1_id, participant2_id  
      ) VALUES (
        'direct', sender_id, receiver_id, sender_id
      ) RETURNING id INTO conversation_id;
    END IF;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PHASE 3: Migration Verification
-- ========================================

CREATE OR REPLACE FUNCTION verify_migration()
RETURNS TABLE (
  old_message_count INTEGER,
  new_message_count INTEGER,
  old_connection_count INTEGER,
  new_conversation_count INTEGER,
  migration_success BOOLEAN
) AS $$
DECLARE
  old_msgs INTEGER;
  new_msgs INTEGER;
  old_conns INTEGER;
  new_convs INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_msgs FROM messages;
  SELECT COUNT(*) INTO new_msgs FROM chat_messages;
  
  SELECT COUNT(DISTINCT connection_id) INTO old_conns 
  FROM messages;
  
  SELECT COUNT(*) INTO new_convs 
  FROM conversations WHERE type = 'direct';
  
  RETURN QUERY SELECT 
    old_msgs,
    new_msgs,
    old_conns,
    new_convs,
    (old_msgs = new_msgs AND old_conns = new_convs);
END;
$$ LANGUAGE plpgsql;
```

## What this creates
- ✅ `migrate_existing_messages()` - Copies your current chats to new system
- ✅ `get_conversation_by_connection_id()` - Bridge function for compatibility
- ✅ `verify_migration()` - Checks migration was successful

## Next Step  
Run `migration-step-3-security.md`