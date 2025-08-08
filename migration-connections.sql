-- Connection requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate connection requests between same users
  UNIQUE(sender_id, receiver_id)
);

-- Enable Row Level Security
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver ON connection_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_sender ON connection_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);

-- RLS Policies
-- Users can view connection requests where they are sender or receiver
CREATE POLICY "Users can view their connection requests" ON connection_requests
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Users can create connection requests as sender
CREATE POLICY "Users can send connection requests" ON connection_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update requests where they are receiver (accept/decline)
CREATE POLICY "Users can update received requests" ON connection_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Add updated_at trigger
CREATE TRIGGER on_connection_requests_updated
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to get connection requests for a user
CREATE OR REPLACE FUNCTION get_connection_requests(
  user_id UUID,
  request_type TEXT DEFAULT 'received' -- 'received', 'sent', 'active'
) RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  message TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  sender_name TEXT,
  sender_avatar_url TEXT,
  receiver_name TEXT,
  receiver_avatar_url TEXT
) AS $$
BEGIN
  IF request_type = 'received' THEN
    -- Pending requests received by user
    RETURN QUERY
    SELECT 
      cr.id,
      cr.sender_id,
      cr.receiver_id,
      cr.message,
      cr.status,
      cr.created_at,
      cr.updated_at,
      sender.display_name as sender_name,
      sender.avatar_url as sender_avatar_url,
      receiver.display_name as receiver_name,
      receiver.avatar_url as receiver_avatar_url
    FROM connection_requests cr
    JOIN profiles sender ON cr.sender_id = sender.id
    JOIN profiles receiver ON cr.receiver_id = receiver.id
    WHERE cr.receiver_id = user_id AND cr.status = 'pending'
    ORDER BY cr.created_at DESC;
    
  ELSIF request_type = 'sent' THEN
    -- Requests sent by user
    RETURN QUERY
    SELECT 
      cr.id,
      cr.sender_id,
      cr.receiver_id,
      cr.message,
      cr.status,
      cr.created_at,
      cr.updated_at,
      sender.display_name as sender_name,
      sender.avatar_url as sender_avatar_url,
      receiver.display_name as receiver_name,
      receiver.avatar_url as receiver_avatar_url
    FROM connection_requests cr
    JOIN profiles sender ON cr.sender_id = sender.id
    JOIN profiles receiver ON cr.receiver_id = receiver.id
    WHERE cr.sender_id = user_id
    ORDER BY cr.created_at DESC;
    
  ELSIF request_type = 'active' THEN
    -- Accepted connections (both directions)
    RETURN QUERY
    SELECT 
      cr.id,
      cr.sender_id,
      cr.receiver_id,
      cr.message,
      cr.status,
      cr.created_at,
      cr.updated_at,
      sender.display_name as sender_name,
      sender.avatar_url as sender_avatar_url,
      receiver.display_name as receiver_name,
      receiver.avatar_url as receiver_avatar_url
    FROM connection_requests cr
    JOIN profiles sender ON cr.sender_id = sender.id
    JOIN profiles receiver ON cr.receiver_id = receiver.id
    WHERE (cr.sender_id = user_id OR cr.receiver_id = user_id) 
      AND cr.status = 'accepted'
    ORDER BY cr.updated_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a connection request
CREATE OR REPLACE FUNCTION send_connection_request(
  receiver_user_id UUID,
  request_message TEXT
) RETURNS UUID AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Check if request already exists
  IF EXISTS (
    SELECT 1 FROM connection_requests 
    WHERE sender_id = auth.uid() AND receiver_id = receiver_user_id
  ) THEN
    RAISE EXCEPTION 'Connection request already exists';
  END IF;
  
  -- Check if reverse request exists and is accepted (already connected)
  IF EXISTS (
    SELECT 1 FROM connection_requests 
    WHERE sender_id = receiver_user_id AND receiver_id = auth.uid() AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Already connected with this user';
  END IF;
  
  -- Create new request
  INSERT INTO connection_requests (sender_id, receiver_id, message)
  VALUES (auth.uid(), receiver_user_id, request_message)
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to respond to a connection request
CREATE OR REPLACE FUNCTION respond_to_connection_request(
  request_id UUID,
  response TEXT -- 'accepted' or 'declined'
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate response
  IF response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response. Must be accepted or declined';
  END IF;
  
  -- Update the request status
  UPDATE connection_requests 
  SET status = response, updated_at = NOW()
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  -- Return whether update was successful
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;