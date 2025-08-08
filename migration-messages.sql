-- Messages table for chat functionality
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES connection_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_connection_created ON messages(connection_id, created_at);

-- RLS Policy: Users can only see messages from their accepted connections
CREATE POLICY "Users can view messages from their connections" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM connection_requests cr 
      WHERE cr.id = messages.connection_id 
        AND (cr.sender_id = auth.uid() OR cr.receiver_id = auth.uid())
        AND cr.status = 'accepted'
    )
  );

-- RLS Policy: Users can only send messages to their accepted connections
CREATE POLICY "Users can send messages to connections" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM connection_requests cr 
      WHERE cr.id = connection_id 
        AND (cr.sender_id = auth.uid() OR cr.receiver_id = auth.uid())
        AND cr.status = 'accepted'
    )
  );

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
  connection_request_id UUID,
  message_content TEXT
) RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  -- Validate message length
  IF LENGTH(message_content) = 0 OR LENGTH(message_content) > 1000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 1000 characters';
  END IF;
  
  -- Verify connection exists and is accepted
  IF NOT EXISTS (
    SELECT 1 FROM connection_requests 
    WHERE id = connection_request_id 
      AND (sender_id = auth.uid() OR receiver_id = auth.uid())
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Invalid or non-accepted connection';
  END IF;
  
  -- Insert message
  INSERT INTO messages (connection_id, sender_id, content)
  VALUES (connection_request_id, auth.uid(), message_content)
  RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages for a connection
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
    WHERE id = connection_request_id 
      AND (sender_id = auth.uid() OR receiver_id = auth.uid())
      AND status = 'accepted'
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