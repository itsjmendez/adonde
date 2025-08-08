-- Fix ambiguous column reference in get_messages function
CREATE OR REPLACE FUNCTION get_messages(
  connection_request_id UUID,
  limit_count INTEGER DEFAULT 50,
  before_timestamp TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  connection_id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  sender_name TEXT,
  sender_avatar_url TEXT
) AS $$
BEGIN
  -- Verify user has access to this connection
  IF NOT EXISTS (
    SELECT 1 FROM connection_requests 
    WHERE connection_requests.id = connection_request_id 
      AND (connection_requests.sender_id = auth.uid() OR connection_requests.receiver_id = auth.uid())
      AND connection_requests.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Access denied to this connection';
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id,
    m.connection_id,
    m.sender_id,
    m.content,
    m.created_at,
    p.display_name as sender_name,
    p.avatar_url as sender_avatar_url
  FROM messages m
  JOIN profiles p ON m.sender_id = p.id
  WHERE m.connection_id = connection_request_id
    AND (before_timestamp IS NULL OR m.created_at < before_timestamp)
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;