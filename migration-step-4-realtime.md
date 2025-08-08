# Step 4: Real-time Features (Typing & Presence)

## What this does
Adds typing indicators and user presence (online/away/offline status) with efficient functions and automatic cleanup.

## SQL to Run in Supabase Dashboard

Go to: https://yzyghloeilyarukytbtv.supabase.co/project/yzyghloeilyarukytbtv/sql/new

**Copy and paste this:**

```sql
-- TYPING INDICATORS & PRESENCE SYSTEM
-- Efficient, low-bandwidth implementation for real-time chat features

-- ========================================
-- TYPING INDICATORS FUNCTIONS
-- ========================================

-- Function to start/update typing indicator
CREATE OR REPLACE FUNCTION start_typing(
  conversation_uuid UUID,
  typing_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
BEGIN
  -- Verify user can access this conversation
  IF NOT user_in_conversation(conversation_uuid, typing_user_id) THEN
    RAISE EXCEPTION 'Access denied to conversation';
  END IF;
  
  -- Insert or update typing indicator
  INSERT INTO typing_indicators (conversation_id, user_id, started_at, expires_at)
  VALUES (
    conversation_uuid, 
    typing_user_id,
    NOW(),
    NOW() + INTERVAL '10 seconds'
  )
  ON CONFLICT (conversation_id, user_id) 
  DO UPDATE SET 
    started_at = NOW(),
    expires_at = NOW() + INTERVAL '10 seconds';
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to stop typing indicator
CREATE OR REPLACE FUNCTION stop_typing(
  conversation_uuid UUID,
  typing_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE conversation_id = conversation_uuid 
    AND user_id = typing_user_id;
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current typers (excluding self)
CREATE OR REPLACE FUNCTION get_typers(
  conversation_uuid UUID,
  excluding_user_id UUID DEFAULT auth.uid()
) RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  started_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify user can access this conversation
  IF NOT user_in_conversation(conversation_uuid, excluding_user_id) THEN
    RAISE EXCEPTION 'Access denied to conversation';
  END IF;
  
  RETURN QUERY
  SELECT 
    t.user_id,
    p.display_name,
    p.avatar_url,
    t.started_at
  FROM typing_indicators t
  JOIN profiles p ON t.user_id = p.id
  WHERE t.conversation_id = conversation_uuid
    AND t.user_id != excluding_user_id
    AND t.expires_at > NOW()
  ORDER BY t.started_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PRESENCE SYSTEM FUNCTIONS  
-- ========================================

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_presence(
  new_status TEXT DEFAULT 'online',
  user_uuid UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate status
  IF new_status NOT IN ('online', 'away', 'offline') THEN
    RAISE EXCEPTION 'Invalid status. Must be: online, away, offline';
  END IF;
  
  -- Insert or update presence
  INSERT INTO user_presence (user_id, status, last_seen, updated_at)
  VALUES (user_uuid, new_status, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = new_status,
    last_seen = CASE 
      WHEN new_status = 'offline' THEN user_presence.last_seen  -- Keep old last_seen
      ELSE NOW()  -- Update last_seen for online/away
    END,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get presence for conversation participants
CREATE OR REPLACE FUNCTION get_conversation_presence(
  conversation_uuid UUID
) RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify user can access this conversation
  IF NOT user_in_conversation(conversation_uuid, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to conversation';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.display_name,
    p.avatar_url,
    COALESCE(up.status, 'offline') as status,
    COALESCE(up.last_seen, p.created_at) as last_seen
  FROM conversations c
  -- Direct chat participants
  LEFT JOIN profiles p ON (
    (c.type = 'direct' AND p.id IN (c.participant1_id, c.participant2_id))
  )
  -- Group chat participants
  LEFT JOIN conversation_participants cp ON (
    c.type = 'group' AND cp.conversation_id = c.id AND cp.left_at IS NULL
  )
  LEFT JOIN profiles p2 ON (c.type = 'group' AND cp.user_id = p2.id)
  -- Presence data
  LEFT JOIN user_presence up ON up.user_id = COALESCE(p.id, p2.id)
  WHERE c.id = conversation_uuid
    AND COALESCE(p.id, p2.id) IS NOT NULL
    AND COALESCE(p.id, p2.id) != auth.uid()  -- Exclude self
  ORDER BY up.updated_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- CLEANUP FUNCTIONS
-- ========================================

-- Function to cleanup expired typing indicators (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale presence (mark users offline after inactivity)
CREATE OR REPLACE FUNCTION cleanup_stale_presence(
  inactivity_threshold INTERVAL DEFAULT '5 minutes'
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_presence 
  SET status = 'offline'
  WHERE status != 'offline' 
    AND updated_at < NOW() - inactivity_threshold;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- OPTIMIZED VIEWS FOR CLIENT USAGE
-- ========================================

-- View for active typing indicators with user details
CREATE VIEW active_typing_indicators AS
SELECT 
  t.conversation_id,
  t.user_id,
  p.display_name,
  p.avatar_url,
  t.started_at,
  t.expires_at
FROM typing_indicators t
JOIN profiles p ON t.user_id = p.id
WHERE t.expires_at > NOW();

-- View for user presence with last activity
CREATE VIEW user_presence_with_activity AS
SELECT 
  up.user_id,
  p.display_name,
  p.avatar_url,
  up.status,
  up.last_seen,
  CASE 
    WHEN up.status = 'online' THEN 'Online'
    WHEN up.status = 'away' THEN 'Away'
    WHEN up.last_seen > NOW() - INTERVAL '1 hour' THEN 'Recently active'
    WHEN up.last_seen > NOW() - INTERVAL '1 day' THEN 'Last seen today'
    WHEN up.last_seen > NOW() - INTERVAL '1 week' THEN 'Last seen this week'
    ELSE 'Last seen ' || date_trunc('day', up.last_seen)::date
  END as status_display
FROM user_presence up
JOIN profiles p ON up.user_id = p.id;
```

## What this creates
- ✅ `start_typing()` / `stop_typing()` - Typing indicator functions
- ✅ `update_presence()` - Set user online/away/offline status
- ✅ `get_conversation_presence()` - See who's online in a chat
- ✅ Automatic cleanup of expired indicators
- ✅ Views for efficient client queries

## Next Step
Run `migration-step-5-execute.md` to migrate your data