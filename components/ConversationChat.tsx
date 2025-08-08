'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Send, Circle } from 'lucide-react'
import { ChatAPI, Message } from '@/lib/chat-api'
import { useTypingIndicators } from '@/hooks/useTypingIndicators'
import { useConversationPresence } from '@/hooks/usePresence'

interface ConversationChatProps {
  conversationId: string
  currentUserId: string
  currentUserName: string
  otherUserName: string
}

export function ConversationChat({ 
  conversationId, 
  currentUserId, 
  currentUserName, 
  otherUserName 
}: ConversationChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Real-time features
  const { typers, handleTyping, stopTyping } = useTypingIndicators(conversationId)
  const { presence, getStatusDisplay } = useConversationPresence(conversationId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load initial messages
  useEffect(() => {
    if (!conversationId) return

    loadMessages()
  }, [conversationId])

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return

    const handleNewMessage = (message: Message) => {
      // Skip if message is from current user (handled optimistically)
      if (message.sender_id === currentUserId) return

      setMessages(prev => {
        // Check for duplicates
        if (prev.some(msg => msg.id === message.id)) return prev
        return [...prev, message]
      })
    }

    ChatAPI.subscribeToMessages(conversationId, handleNewMessage)

    return () => {
      ChatAPI.unsubscribeFromMessages(conversationId, handleNewMessage)
    }
  }, [conversationId, currentUserId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const messages = await ChatAPI.getMessages(conversationId, 50)
      setMessages(messages)
      setHasMore(messages.length === 50)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreMessages = async () => {
    if (!hasMore || loading) return

    try {
      const oldestMessage = messages[0]
      const olderMessages = await ChatAPI.getMessages(
        conversationId, 
        50, 
        oldestMessage?.created_at
      )

      if (olderMessages.length === 0) {
        setHasMore(false)
        return
      }

      setMessages(prev => [...olderMessages, ...prev])
      setHasMore(olderMessages.length === 50)
    } catch (error) {
      console.error('Error loading more messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    
    // Stop typing indicator
    stopTyping()
    
    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender_name: currentUserName,
      sender_avatar_url: null
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setSending(true)
    
    try {
      const messageId = await ChatAPI.sendMessage(conversationId, messageContent)
      
      if (messageId) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: messageId }
            : msg
        ))
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        setNewMessage(messageContent) // Restore message text
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (e.target.value.trim()) {
      handleTyping()
    }
  }

  const handleInputBlur = () => {
    stopTyping()
  }

  // Get presence status for the other user
  const otherUserPresence = presence.find(p => p.user_id !== currentUserId)
  const presenceStatus = otherUserPresence ? getStatusDisplay(otherUserPresence) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header with presence */}
      <div className="border-b border-input p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat with {otherUserName}</h2>
          {presenceStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle 
                className={cn(
                  "h-2 w-2 fill-current",
                  otherUserPresence?.status === 'online' && "text-green-500",
                  otherUserPresence?.status === 'away' && "text-yellow-500",
                  otherUserPresence?.status === 'offline' && "text-gray-400"
                )}
              />
              {presenceStatus}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load more button */}
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMoreMessages}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load older messages'}
            </Button>
          </div>
        )}

        {loading && messages.length === 0 ? (
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

        {/* Typing indicators */}
        {typers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-accent text-accent-foreground rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
                <span className="text-xs opacity-70">
                  {typers.length === 1 
                    ? `${typers[0].display_name} is typing...`
                    : `${typers.length} people are typing...`
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="border-t border-input p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
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