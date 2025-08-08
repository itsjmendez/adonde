-- Scalable Chat Architecture for 1:1 and Group Chats
-- Designed for easy migration from existing messages table

-- ========================================
-- CONVERSATIONS TABLE - Core chat container
-- ========================================
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('direct', 'group')) NOT NULL DEFAULT 'direct',
  name TEXT, -- NULL for direct chats, named for groups
  description TEXT, -- For group chat descriptions
  avatar_url TEXT, -- For group chat avatars
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For 1:1 chats, store both participants for easy querying
  participant1_id UUID REFERENCES profiles(id), 
  participant2_id UUID REFERENCES profiles(id),
  
  -- Ensure direct chats have exactly 2 participants
  CONSTRAINT direct_chat_participants CHECK (
    (type = 'direct' AND participant1_id IS NOT NULL AND participant2_id IS NOT NULL)
    OR (type = 'group' AND participant1_id IS NULL AND participant2_id IS NULL)
  ),
  
  -- Prevent duplicate direct conversations
  CONSTRAINT unique_direct_conversation UNIQUE (participant1_id, participant2_id)
);

-- ========================================
-- CONVERSATION PARTICIPANTS - Group memberships
-- ========================================
CREATE TABLE conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('member', 'admin', 'owner')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ, -- NULL if still active
  
  -- Prevent duplicate memberships
  UNIQUE(conversation_id, user_id)
);

-- ========================================
-- MESSAGES TABLE - Enhanced from your existing one
-- ========================================
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 1000),
  message_type TEXT CHECK (message_type IN ('text', 'system')) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete for message history
  
  -- Reply/thread support for future
  reply_to_id UUID REFERENCES chat_messages(id),
  
  -- Read receipts tracking
  read_by JSONB DEFAULT '{}' -- {user_id: timestamp}
);

-- ========================================
-- TYPING INDICATORS - Ephemeral presence
-- ========================================
CREATE TABLE typing_indicators (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 seconds'),
  
  PRIMARY KEY (conversation_id, user_id)
);

-- ========================================
-- USER PRESENCE - Online status
-- ========================================
CREATE TABLE user_presence (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  status TEXT CHECK (status IN ('online', 'away', 'offline')) DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES for Performance
-- ========================================

-- Conversations
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_participants ON conversations(participant1_id, participant2_id) WHERE type = 'direct';
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation_time ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_messages_created_at ON chat_messages(created_at DESC);

-- Participants
CREATE INDEX idx_participants_user ON conversation_participants(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id) WHERE left_at IS NULL;

-- Presence
CREATE INDEX idx_presence_status ON user_presence(status, updated_at);
CREATE INDEX idx_typing_expires ON typing_indicators(expires_at);

-- ========================================
-- TRIGGERS
-- ========================================

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Auto-cleanup expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_typing_indicators
  AFTER INSERT ON typing_indicators
  FOR EACH STATEMENT EXECUTE FUNCTION cleanup_expired_typing();

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;