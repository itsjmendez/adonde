# WebSocket Subscription Architecture for Scalable Chat

## **Subscription Strategy: Bandwidth-Optimized**

### **Core Principle: Minimal Channels, Maximum Efficiency**

Instead of multiple channels per chat, use a **user-centric subscription model**:

```typescript
// SINGLE subscription per user for all their chats
const userChannel = supabase
  .channel(`user:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public', 
    table: 'chat_messages',
    filter: `conversation_id=in.(${userConversationIds.join(',')})`
  })
```

## **Subscription Filters by Feature**

### **1. Messages Subscription**
```typescript
// Subscribe to messages from all user's conversations
const messagesSubscription = {
  event: 'INSERT',
  schema: 'public',
  table: 'chat_messages', 
  filter: `conversation_id=in.(${conversationIds.join(',')})` // Dynamic list
}
```

### **2. Typing Indicators Subscription**  
```typescript
// Subscribe to typing in active conversation only
const typingSubscription = {
  event: '*', // INSERT, UPDATE, DELETE
  schema: 'public',
  table: 'typing_indicators',
  filter: `conversation_id=eq.${currentConversationId}` // Single conversation
}
```

### **3. Presence Subscription**
```typescript
// Subscribe to presence of connected users only
const presenceSubscription = {
  event: 'UPDATE',
  schema: 'public', 
  table: 'user_presence',
  filter: `user_id=in.(${connectedUserIds.join(',')})` // People you chat with
}
```

## **Dynamic Filter Management**

### **Conversation List Management**
```typescript
class ConversationManager {
  private conversationIds: string[] = []
  private channel: RealtimeChannel | null = null
  
  async initializeSubscriptions(userId: string) {
    // Get all user's conversation IDs
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    
    this.conversationIds = conversations?.map(c => c.id) || []
    
    // Set up single channel with dynamic filters
    this.setupUserChannel(userId)
  }
  
  addConversation(conversationId: string) {
    if (!this.conversationIds.includes(conversationId)) {
      this.conversationIds.push(conversationId)
      this.updateSubscriptionFilters()
    }
  }
  
  private updateSubscriptionFilters() {
    // Supabase doesn't support dynamic filter updates
    // Solution: Reconnect channel with new filters (efficient enough)
    this.reconnectWithNewFilters()
  }
}
```

## **Bandwidth Optimization Techniques**

### **1. Selective Field Subscription**
```sql
-- Only subscribe to essential fields
SELECT id, conversation_id, sender_id, content, created_at
FROM chat_messages
-- Skip heavy fields like read_by, updated_at initially
```

### **2. Client-Side Message Enrichment**
```typescript
// Receive minimal message data via WebSocket
interface MinimalMessage {
  id: string
  conversation_id: string
  sender_id: string  
  content: string
  created_at: string
}

// Enrich with sender details on client
async function enrichMessage(message: MinimalMessage) {
  const senderDetails = await getOrCacheUserProfile(message.sender_id)
  return {
    ...message,
    sender_name: senderDetails.display_name,
    sender_avatar: senderDetails.avatar_url
  }
}
```

### **3. Connection Pooling Strategy**
```typescript
// Share single WebSocket connection across components
class GlobalChatSocket {
  private static instance: GlobalChatSocket
  private channel: RealtimeChannel | null = null
  private subscribers: Map<string, Function[]> = new Map()
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new GlobalChatSocket()
    }
    return this.instance
  }
  
  subscribe(event: string, callback: Function) {
    const callbacks = this.subscribers.get(event) || []
    callbacks.push(callback)
    this.subscribers.set(event, callbacks)
  }
  
  private broadcastToSubscribers(event: string, data: any) {
    const callbacks = this.subscribers.get(event) || []
    callbacks.forEach(callback => callback(data))
  }
}
```

## **Subscription Lifecycle Management**

### **Component Mount/Unmount Pattern**
```typescript
// In React components
useEffect(() => {
  const subscription = GlobalChatSocket.getInstance()
  
  // Subscribe to relevant events
  subscription.subscribe('message_received', handleNewMessage)
  subscription.subscribe('typing_indicator', handleTypingUpdate)
  subscription.subscribe('presence_update', handlePresenceChange)
  
  return () => {
    // Unsubscribe on unmount
    subscription.unsubscribe('message_received', handleNewMessage)
    subscription.unsubscribe('typing_indicator', handleTypingUpdate) 
    subscription.unsubscribe('presence_update', handlePresenceChange)
  }
}, [conversationId])
```

### **Conversation Switching Optimization**
```typescript
// When switching between chats
async function switchToConversation(conversationId: string) {
  // Don't recreate message subscription (stays global)
  // Only update typing subscription (conversation-specific)
  
  const chatSocket = GlobalChatSocket.getInstance()
  await chatSocket.updateTypingSubscription(conversationId)
  
  // Load message history for new conversation
  await loadConversationHistory(conversationId)
}
```

## **Error Handling & Reconnection**

### **Robust Connection Management**
```typescript
class ReconnectionManager {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private baseDelay = 1000 // 1 second
  
  async handleConnectionLost() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Fall back to polling for critical messages
      this.startEmergencyPolling()
      return
    }
    
    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts)
    setTimeout(() => {
      this.attemptReconnection()
    }, delay)
    
    this.reconnectAttempts++
  }
  
  private startEmergencyPolling() {
    // Poll for new messages every 10 seconds as fallback
    setInterval(() => {
      this.checkForMissedMessages()
    }, 10000)
  }
}
```

## **Performance Monitoring**

### **WebSocket Health Metrics**
```typescript
class SocketMetrics {
  private messageLatency: number[] = []
  private reconnectCount = 0
  private lastHeartbeat = Date.now()
  
  recordMessageLatency(sentAt: number) {
    const latency = Date.now() - sentAt
    this.messageLatency.push(latency)
    
    // Keep only last 100 measurements
    if (this.messageLatency.length > 100) {
      this.messageLatency.shift()
    }
  }
  
  getAverageLatency() {
    if (this.messageLatency.length === 0) return 0
    return this.messageLatency.reduce((a, b) => a + b) / this.messageLatency.length
  }
  
  isConnectionHealthy() {
    const avgLatency = this.getAverageLatency()
    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat
    
    return avgLatency < 500 && timeSinceHeartbeat < 30000 // 30 seconds
  }
}
```