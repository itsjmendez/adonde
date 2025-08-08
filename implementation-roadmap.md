# Implementation Roadmap: Scalable Chat System

## **Phase 1: Foundation (Week 1)**

### **1.1 Database Migration**
```bash
# Execute in this order:
1. scalable-chat-schema.sql      # Create new tables
2. migration-strategy.sql        # Migration functions  
3. chat-rls-policies.sql        # Security policies
4. typing-presence-system.sql   # Typing & presence features

# Verify migration
SELECT * FROM verify_migration();
```

### **1.2 Basic API Functions**
```typescript
// lib/chat-api.ts
export class ChatAPI {
  // Conversation management
  static async createDirectConversation(userId1: string, userId2: string)
  static async getConversations(userId: string)
  static async getMessages(conversationId: string, limit = 50, before?: string)
  
  // Messaging
  static async sendMessage(conversationId: string, content: string)
  static async markMessageAsRead(messageId: string)
  
  // Real-time subscriptions
  static subscribeToUserMessages(userId: string, callback: Function)
  static subscribeToTyping(conversationId: string, callback: Function)
  static subscribeToPresence(userIds: string[], callback: Function)
}
```

## **Phase 2: Core Features (Week 2)**

### **2.1 Conversation Components**
```typescript
// components/chat/ConversationList.tsx
interface ConversationListProps {
  userId: string
  onConversationSelect: (conversationId: string) => void
}

// components/chat/MessageThread.tsx  
interface MessageThreadProps {
  conversationId: string
  currentUserId: string
}

// components/chat/MessageInput.tsx
interface MessageInputProps {
  conversationId: string
  onMessageSent: (message: Message) => void
  onTypingChange: (isTyping: boolean) => void
}
```

### **2.2 Real-time Integration**
```typescript
// hooks/useConversations.ts
export function useConversations(userId: string) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Load initial conversations
    loadConversations()
    
    // Subscribe to new conversations
    const subscription = ChatAPI.subscribeToUserMessages(userId, handleNewMessage)
    
    return () => subscription.unsubscribe()
  }, [userId])
}

// hooks/useTypingIndicators.ts
export function useTypingIndicators(conversationId: string) {
  const [typers, setTypers] = useState([])
  
  useEffect(() => {
    const subscription = ChatAPI.subscribeToTyping(conversationId, setTypers)
    return () => subscription.unsubscribe()
  }, [conversationId])
  
  const startTyping = () => ChatAPI.startTyping(conversationId)
  const stopTyping = () => ChatAPI.stopTyping(conversationId)
  
  return { typers, startTyping, stopTyping }
}
```

## **Phase 3: Enhanced Features (Week 3)**

### **3.1 Presence System**
```typescript
// hooks/usePresence.ts
export function usePresence() {
  const updateStatus = (status: 'online' | 'away' | 'offline') => {
    return ChatAPI.updatePresence(status)
  }
  
  // Auto-update presence based on tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      updateStatus(document.hidden ? 'away' : 'online')
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
```

### **3.2 Message Features**
```typescript
// Message pagination
export function useMessagePagination(conversationId: string) {
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const oldestMessage = messages[0]
    const newMessages = await ChatAPI.getMessages(
      conversationId, 
      50, 
      oldestMessage?.created_at
    )
    
    setMessages(prev => [...newMessages, ...prev])
    setHasMore(newMessages.length === 50)
    setLoading(false)
  }
  
  return { messages, loadMore, hasMore, loading }
}
```

## **Phase 4: Group Chat Extension (Week 4)**

### **4.1 Group Management Components**
```typescript
// components/chat/CreateGroupChat.tsx
interface CreateGroupChatProps {
  availableUsers: User[]
  onGroupCreated: (conversationId: string) => void
}

// components/chat/GroupSettings.tsx
interface GroupSettingsProps {
  conversationId: string
  currentUserRole: 'member' | 'admin' | 'owner'
}
```

### **4.2 Extended API Functions**
```typescript
export class GroupChatAPI extends ChatAPI {
  // Group management
  static async createGroupConversation(name: string, userIds: string[])
  static async addParticipant(conversationId: string, userId: string)
  static async removeParticipant(conversationId: string, userId: string)
  static async updateGroupInfo(conversationId: string, updates: Partial<GroupInfo>)
  
  // Permissions
  static async promoteToAdmin(conversationId: string, userId: string)
  static async demoteFromAdmin(conversationId: string, userId: string)
  static async leaveGroup(conversationId: string)
}
```

## **Migration Strategy from Current System**

### **Step 1: Parallel Implementation**
```typescript
// Keep existing Chat component working
// Add new ConversationChat component alongside

// lib/chat-migration.ts
export class MigrationHelper {
  // Convert connection_request_id to conversation_id
  static async getConversationId(connectionRequestId: string): Promise<string> {
    const conversationId = await supabase.rpc(
      'get_conversation_by_connection_id', 
      { connection_request_id: connectionRequestId }
    )
    return conversationId.data
  }
  
  // Gradual migration flag
  static async shouldUseNewChat(userId: string): Promise<boolean> {
    // Start with small percentage of users
    // Gradually increase as system proves stable
    return hash(userId) % 100 < 10 // 10% of users initially
  }
}
```

### **Step 2: Component Switching**
```typescript
// app/chat/[connectionId]/page.tsx - Modified
export default function ChatPage({ params }: ChatPageProps) {
  const [useNewSystem, setUseNewSystem] = useState(false)
  
  useEffect(() => {
    MigrationHelper.shouldUseNewChat(currentUser.id)
      .then(setUseNewSystem)
  }, [currentUser.id])
  
  if (useNewSystem) {
    return <NewConversationChat connectionId={connectionId} />
  } else {
    return <LegacyChat connectionId={connectionId} />
  }
}
```

### **Step 3: Data Verification**
```typescript
// Continuous validation during migration
export class DataValidator {
  static async validateMigration(userId: string) {
    const oldMessageCount = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('sender_id', userId)
    
    const newMessageCount = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('sender_id', userId)
    
    if (oldMessageCount.count !== newMessageCount.count) {
      // Alert monitoring system
      console.error('Migration data mismatch for user:', userId)
    }
  }
}
```

## **Performance Considerations**

### **Database Optimizations**
```sql
-- Additional indexes for common queries
CREATE INDEX CONCURRENTLY idx_conversations_user_activity 
  ON conversations(participant1_id, last_message_at DESC) 
  WHERE type = 'direct';
  
CREATE INDEX CONCURRENTLY idx_conversations_user2_activity 
  ON conversations(participant2_id, last_message_at DESC) 
  WHERE type = 'direct';

-- Partial index for active group memberships  
CREATE INDEX CONCURRENTLY idx_active_group_members
  ON conversation_participants(conversation_id, user_id)
  WHERE left_at IS NULL;
```

### **Connection Pooling**
```typescript
// lib/supabase-pool.ts
class SupabasePool {
  private static readOnlyClient = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'public' },
    realtime: { params: { log_level: 'info' } }
  })
  
  static getReadClient() {
    return this.readOnlyClient
  }
  
  // Use read replica for message history
  static async getMessageHistory(conversationId: string, limit: number) {
    return this.readOnlyClient
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)
  }
}
```

This architecture provides:
- ✅ **Easy migration** from your current system
- ✅ **Scalable to group chats** without rewriting
- ✅ **Efficient WebSocket usage** with minimal bandwidth
- ✅ **Proper security** with RLS for both chat types
- ✅ **Performance optimized** with smart indexing
- ✅ **Real-time features** (typing, presence) built-in