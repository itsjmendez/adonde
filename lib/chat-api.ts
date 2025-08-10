import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'system'
  created_at: string
  updated_at: string
  sender_name?: string
  sender_avatar_url?: string | null
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string | null
  description?: string | null
  avatar_url?: string | null
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string
  participant1_id?: string | null
  participant2_id?: string | null
}

export interface TypingIndicator {
  user_id: string
  display_name: string
  avatar_url?: string | null
  started_at: string
}

export interface UserPresence {
  user_id: string
  display_name: string
  avatar_url?: string | null
  status: 'online' | 'away' | 'offline'
  last_seen: string
}

type MessageCallback = (message: Message) => void
type TypingCallback = (typers: TypingIndicator[]) => void
type PresenceCallback = (presence: UserPresence[]) => void

export class ChatAPI {
  private static channel: RealtimeChannel | null = null
  private static messageSubscribers: Map<string, MessageCallback[]> = new Map()
  private static typingSubscribers: Map<string, TypingCallback[]> = new Map()
  private static presenceSubscribers: Map<string, PresenceCallback[]> = new Map()
  private static userConversationIds: string[] = []
  private static currentUserId: string | null = null

  // ========================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================

  static async initializeSubscriptions(userId: string) {
    console.log('🔧 Initializing ChatAPI subscriptions for user:', userId)
    this.currentUserId = userId
    
    // Get all user's conversation IDs
    console.log('📋 Loading user conversations...')
    await this.loadUserConversations(userId)
    console.log('✅ Loaded conversations, setting up channel...')
    
    // Set up single channel with dynamic filters
    this.setupUserChannel(userId)
    console.log('🎯 ChatAPI initialization complete')
  }

  private static async loadUserConversations(userId: string) {
    console.log('🔍 Querying conversations for user:', userId)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)

    if (error) {
      console.error('❌ Error loading conversations:', error)
      this.userConversationIds = []
      return
    }

    this.userConversationIds = conversations?.map(c => c.id) || []
    console.log('📝 Found conversations:', this.userConversationIds)
  }

  private static setupUserChannel(userId: string) {
    if (this.channel) {
      supabase.removeChannel(this.channel)
    }

    console.log('Setting up user channel for:', userId)
    console.log('User conversation IDs:', this.userConversationIds)

    this.channel = supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
        // Remove the filter for now to catch all messages
      }, (payload) => {
        console.log('📨 New message received via WebSocket:', payload)
        this.handleNewMessage(payload.new as Message)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators'
      }, (payload) => {
        console.log('⌨️ Typing update:', payload)
        this.handleTypingUpdate(payload)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        console.log('👤 Presence update:', payload)
        this.handlePresenceUpdate(payload.new as UserPresence)
      })
      .on('subscribe', (status) => {
        console.log('📡 Channel subscription status:', status)
      })
      .subscribe((status, error) => {
        console.log('🚀 Initial subscribe callback - Status:', status)
        if (error) {
          console.error('❌ Subscription error:', error)
        }
      })
  }

  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================

  static async getConversationByConnectionId(connectionId: string): Promise<string | null> {
    console.log('Looking up conversation for connection:', connectionId)
    
    const { data, error } = await supabase.rpc('get_conversation_by_connection_id', {
      connection_request_id: connectionId
    })

    if (error) {
      console.error('Error getting conversation:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return null
    }

    console.log('Conversation lookup result:', data)
    return data
  }

  static async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error getting conversations:', error)
      return []
    }

    return data || []
  }

  static async getLastMessage(conversationId: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        created_at,
        updated_at,
        profiles!chat_messages_sender_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return null
    }

    return {
      id: data.id,
      conversation_id: data.conversation_id,
      sender_id: data.sender_id,
      content: data.content,
      message_type: data.message_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
      sender_name: (data.profiles as any)?.display_name || 'Unknown',
      sender_avatar_url: (data.profiles as any)?.avatar_url || null
    }
  }

  // ========================================
  // READ STATUS TRACKING
  // ========================================

  static async markConversationRead(conversationId: string): Promise<boolean> {
    const { error } = await supabase.rpc('mark_conversation_read', {
      conversation_uuid: conversationId
    })

    return !error
  }

  static async hasUnreadMessages(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_unread_messages', {
      conversation_uuid: conversationId
    })

    if (error) {
      console.error('Error checking unread messages:', error)
      return false
    }

    return data === true
  }

  // ========================================
  // MESSAGING
  // ========================================

  static async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    let query = supabase
      .from('chat_messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        created_at,
        updated_at,
        profiles!chat_messages_sender_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting messages:', error)
      return []
    }

    // Transform and reverse to get chronological order
    const transformedMessages = data?.map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      message_type: msg.message_type,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender_name: (msg.profiles as any)?.display_name || 'Unknown',
      sender_avatar_url: (msg.profiles as any)?.avatar_url || null
    })) || []

    return transformedMessages.reverse()
  }

  static async sendMessage(conversationId: string, content: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: conversationId,
        sender_id: this.currentUserId,
        content: content.trim(),
        message_type: 'text'
      }])
      .select('id')
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return null
    }

    return data?.id || null
  }

  // ========================================
  // TYPING INDICATORS
  // ========================================

  static async startTyping(conversationId: string): Promise<boolean> {
    const { error } = await supabase.rpc('start_typing', {
      conversation_uuid: conversationId
    })

    return !error
  }

  static async stopTyping(conversationId: string): Promise<boolean> {
    const { error } = await supabase.rpc('stop_typing', {
      conversation_uuid: conversationId
    })

    return !error
  }

  static async getTypers(conversationId: string): Promise<TypingIndicator[]> {
    const { data, error } = await supabase.rpc('get_typers', {
      conversation_uuid: conversationId
    })

    if (error) {
      console.error('Error getting typers:', error)
      return []
    }

    return data || []
  }

  // ========================================
  // PRESENCE SYSTEM
  // ========================================

  static async updatePresence(status: 'online' | 'away' | 'offline' = 'online'): Promise<boolean> {
    const { error } = await supabase.rpc('update_presence', {
      new_status: status
    })

    return !error
  }

  static async getConversationPresence(conversationId: string): Promise<UserPresence[]> {
    const { data, error } = await supabase.rpc('get_conversation_presence', {
      conversation_uuid: conversationId
    })

    if (error) {
      console.error('Error getting conversation presence:', error)
      return []
    }

    return data || []
  }

  // ========================================
  // SUBSCRIPTION HANDLERS
  // ========================================

  private static handleNewMessage(message: Message) {
    console.log('🔄 Processing new message:', message)
    // Enrich message with sender details if needed
    this.enrichAndBroadcastMessage(message)
  }

  private static async enrichAndBroadcastMessage(message: Message) {
    console.log('📋 Enriching message:', message.id, 'for conversation:', message.conversation_id)
    
    // If sender details are missing, fetch them
    if (!message.sender_name) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', message.sender_id)
        .single()

      if (profile) {
        message.sender_name = profile.display_name || 'Unknown'
        message.sender_avatar_url = profile.avatar_url
      }
    }

    // Broadcast to conversation subscribers
    const callbacks = this.messageSubscribers.get(message.conversation_id) || []
    console.log('📢 Broadcasting to', callbacks.length, 'subscribers for conversation:', message.conversation_id)
    callbacks.forEach(callback => callback(message))
  }

  private static async handleTypingUpdate(payload: any) {
    const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
    if (!conversationId) return

    // Fetch current typers for this conversation
    const typers = await this.getTypers(conversationId)
    
    // Broadcast to typing subscribers
    const callbacks = this.typingSubscribers.get(conversationId) || []
    callbacks.forEach(callback => callback(typers))
  }

  private static handlePresenceUpdate(presence: UserPresence) {
    // Find conversations this user is in
    this.userConversationIds.forEach(conversationId => {
      const callbacks = this.presenceSubscribers.get(conversationId) || []
      callbacks.forEach(async callback => {
        // Get updated presence for this conversation
        const conversationPresence = await this.getConversationPresence(conversationId)
        callback(conversationPresence)
      })
    })
  }

  // ========================================
  // SUBSCRIPTION INTERFACE
  // ========================================

  static subscribeToMessages(conversationId: string, callback: MessageCallback) {
    const callbacks = this.messageSubscribers.get(conversationId) || []
    callbacks.push(callback)
    this.messageSubscribers.set(conversationId, callbacks)
  }

  static subscribeToTyping(conversationId: string, callback: TypingCallback) {
    const callbacks = this.typingSubscribers.get(conversationId) || []
    callbacks.push(callback)
    this.typingSubscribers.set(conversationId, callbacks)
  }

  static subscribeToPresence(conversationId: string, callback: PresenceCallback) {
    const callbacks = this.presenceSubscribers.get(conversationId) || []
    callbacks.push(callback)
    this.presenceSubscribers.set(conversationId, callbacks)
  }

  static unsubscribeFromMessages(conversationId: string, callback: MessageCallback) {
    const callbacks = this.messageSubscribers.get(conversationId) || []
    const filtered = callbacks.filter(cb => cb !== callback)
    this.messageSubscribers.set(conversationId, filtered)
  }

  static unsubscribeFromTyping(conversationId: string, callback: TypingCallback) {
    const callbacks = this.typingSubscribers.get(conversationId) || []
    const filtered = callbacks.filter(cb => cb !== callback)
    this.typingSubscribers.set(conversationId, filtered)
  }

  static unsubscribeFromPresence(conversationId: string, callback: PresenceCallback) {
    const callbacks = this.presenceSubscribers.get(conversationId) || []
    const filtered = callbacks.filter(cb => cb !== callback)
    this.presenceSubscribers.set(conversationId, filtered)
  }

  // ========================================
  // CLEANUP
  // ========================================

  static cleanup() {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.messageSubscribers.clear()
    this.typingSubscribers.clear()
    this.presenceSubscribers.clear()
    this.userConversationIds = []
    this.currentUserId = null
  }
}