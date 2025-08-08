'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender_name: string
  sender_avatar_url: string | null
}

interface ChatProps {
  connectionId: string
  currentUserId: string
  currentUserName: string
  otherUserName: string
}

export function Chat({ connectionId, currentUserId, currentUserName, otherUserName }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastMessageTime, setLastMessageTime] = useState<string | null>(null)
  const [subscriptionReady, setSubscriptionReady] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load initial messages after subscription is ready
  useEffect(() => {
    if (subscriptionReady) {
      loadMessages()
    }
  }, [connectionId, subscriptionReady])

  // Set up realtime subscription
  useEffect(() => {
    console.log('Setting up realtime subscription for connection:', connectionId)
    
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`
        },
        async (payload) => {
          console.log('🔴 New message received via realtime:', payload)
          
          // Skip if this message is from the current user (already handled optimistically)
          if (payload.new.sender_id === currentUserId) {
            console.log('Skipping own message - already added optimistically')
            return
          }
          
          // Get the sender profile info for messages from other users
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single()
            
            if (!profileError) {
              const newMessage = {
                id: payload.new.id,
                content: payload.new.content,
                sender_id: payload.new.sender_id,
                created_at: payload.new.created_at,
                sender_name: profileData.display_name || 'Unknown',
                sender_avatar_url: profileData.avatar_url || null
              }
              
              console.log('✅ Adding incoming message to UI:', newMessage)
              setMessages(prev => {
                // Check if message already exists to avoid duplicates
                if (prev.some(msg => msg.id === newMessage.id)) {
                  console.log('Message already exists, skipping')
                  return prev
                }
                return [...prev, newMessage]
              })
            }
          } catch (error) {
            console.error('Error processing new message:', error)
          }
        }
      )
      .on('subscribe', (status) => {
        console.log('📡 Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscription is ready!')
          setSubscriptionReady(true)
        }
      })
      .on('error', (error) => {
        console.error('❌ Realtime subscription error:', error)
        // Still allow loading even if subscription fails
        setTimeout(() => setSubscriptionReady(true), 1000)
      })
      .subscribe((status) => {
        console.log('🚀 Initial subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setSubscriptionReady(true)
        }
      })

    return () => {
      console.log('🔌 Unsubscribing from realtime channel')
      setSubscriptionReady(false)
      supabase.removeChannel(channel)
    }
  }, [connectionId, currentUserId])

  // Fallback polling mechanism in case realtime doesn't work
  useEffect(() => {
    if (!lastMessageTime) {
      console.log('⏳ Waiting for lastMessageTime to be set before starting polling...')
      return
    }

    const pollForNewMessages = async () => {
      try {
        console.log('🔄 Polling for new messages after:', lastMessageTime)
        const { data: newMessages, error } = await supabase
          .from('messages')
          .select(`
            id,
            connection_id,
            sender_id,
            content,
            created_at,
            profiles!messages_sender_id_fkey (
              display_name,
              avatar_url
            )
          `)
          .eq('connection_id', connectionId)
          .gt('created_at', lastMessageTime)
          .order('created_at', { ascending: true })

        if (!error && newMessages && newMessages.length > 0) {
          console.log('📥 Polling found new messages:', newMessages)
          
          const transformedNewMessages = newMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            created_at: msg.created_at,
            sender_name: msg.profiles?.display_name || 'Unknown',
            sender_avatar_url: msg.profiles?.avatar_url || null
          }))

          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const uniqueNewMessages = transformedNewMessages.filter(m => !existingIds.has(m.id))
            
            if (uniqueNewMessages.length > 0) {
              console.log('➕ Adding', uniqueNewMessages.length, 'new messages to UI')
              setLastMessageTime(uniqueNewMessages[uniqueNewMessages.length - 1].created_at)
              return [...prev, ...uniqueNewMessages]
            }
            return prev
          })
        } else {
          console.log('📭 No new messages found in polling')
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Poll every 3 seconds as fallback
    const interval = setInterval(pollForNewMessages, 3000)
    return () => clearInterval(interval)
  }, [connectionId, lastMessageTime])

  const loadMessages = async () => {
    try {
      console.log('Loading messages for connection:', connectionId)
      
      // Try direct query first to see if RPC is the issue
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          connection_id,
          sender_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true })
        .limit(50)
      
      if (messagesError) {
        console.error('Direct query error:', messagesError)
        throw messagesError
      }
      
      console.log('Raw messages data:', messagesData)
      
      // Transform the data to match our Message interface
      const transformedMessages = messagesData?.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        created_at: msg.created_at,
        sender_name: msg.profiles?.display_name || 'Unknown',
        sender_avatar_url: msg.profiles?.avatar_url || null
      })) || []
      
      console.log('Transformed messages:', transformedMessages)
      setMessages(transformedMessages)
      
      // Update last message time for polling
      if (transformedMessages.length > 0) {
        setLastMessageTime(transformedMessages[transformedMessages.length - 1].created_at)
        // Check for any messages that might have been sent during setup
        setTimeout(checkForMissedMessages, 500)
      } else {
        // For empty chats, set a baseline time to enable polling and missed message checks
        const baselineTime = new Date(Date.now() - 60000).toISOString() // 1 minute ago
        setLastMessageTime(baselineTime)
        console.log('📝 Empty chat detected, setting baseline time for polling:', baselineTime)
        // Still check for missed messages in case some were sent during setup
        setTimeout(checkForMissedMessages, 500)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check for messages that might have been missed during subscription setup
  const checkForMissedMessages = async () => {
    if (!lastMessageTime) {
      console.log('⚠️ No lastMessageTime set, cannot check for missed messages')
      return
    }
    
    try {
      console.log('🔍 Checking for missed messages since subscription setup...')
      const { data: missedMessages, error } = await supabase
        .from('messages')
        .select(`
          id,
          connection_id,
          sender_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('connection_id', connectionId)
        .gt('created_at', lastMessageTime)
        .order('created_at', { ascending: true })

      if (!error && missedMessages && missedMessages.length > 0) {
        console.log('📨 Found missed messages:', missedMessages)
        
        const transformedMissedMessages = missedMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          sender_name: msg.profiles?.display_name || 'Unknown',
          sender_avatar_url: msg.profiles?.avatar_url || null
        }))

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const uniqueMissedMessages = transformedMissedMessages.filter(m => !existingIds.has(m.id))
          
          if (uniqueMissedMessages.length > 0) {
            setLastMessageTime(uniqueMissedMessages[uniqueMissedMessages.length - 1].created_at)
            return [...prev, ...uniqueMissedMessages]
          }
          return prev
        })
      }
    } catch (error) {
      console.error('Error checking for missed messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}` // Temporary ID for optimistic update
    
    console.log('Sending message:', messageContent, 'to connection:', connectionId)
    
    // Optimistic update - add message to UI immediately
    const optimisticMessage = {
      id: tempId,
      content: messageContent,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      sender_name: currentUserName,
      sender_avatar_url: null
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setSending(true)
    
    try {
      const { data, error } = await supabase.rpc('send_message', {
        connection_request_id: connectionId,
        message_content: messageContent
      })

      if (error) {
        console.error('Send message error:', error)
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setNewMessage(messageContent) // Restore the message text
        throw error
      }
      
      console.log('Message sent successfully:', data)
      
      // Replace optimistic message with real message data
      // Note: The real-time subscription should handle this, but let's be safe
      const realMessageId = data
      if (realMessageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: realMessageId }
            : msg
        ))
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-input p-4">
        <h2 className="text-lg font-semibold">Chat with {otherUserName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUserId
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  )}
                >
                  <p>{message.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-1 opacity-70",
                      isCurrentUser ? "text-right" : "text-left"
                    )}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="border-t border-input p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={1000}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}