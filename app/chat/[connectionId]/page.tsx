'use client'

import { useState, useEffect } from 'react'
import { Chat } from '@/components/chat'
import { ConversationChat } from '@/components/ConversationChat'
import { Navigation } from '@/components/navigation'
import { supabase } from '@/lib/supabase'
import { ChatAPI } from '@/lib/chat-api'
import { usePresence } from '@/hooks/usePresence'

interface ChatPageProps {
  params: Promise<{ connectionId: string }>;
}

interface ConnectionData {
  id: string
  sender_id: string
  receiver_id: string
  sender_name: string
  receiver_name: string
  status: string
}

export default function ChatPage({ params }: ChatPageProps) {
  const [connectionId, setConnectionId] = useState<string>('')
  const [conversationId, setConversationId] = useState<string>('')
  const [connection, setConnection] = useState<ConnectionData | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useNewSystem, setUseNewSystem] = useState(true) // Default to new system

  // Initialize presence system
  usePresence()

  useEffect(() => {
    const unwrapParams = async () => {
      const { connectionId: id } = await params
      setConnectionId(id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!connectionId) return
    
    const initializePage = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please log in to access chat')
          setLoading(false)
          return
        }
        setCurrentUser(user)

        // Initialize ChatAPI for this user
        await ChatAPI.initializeSubscriptions(user.id)

        // Get connection details
        const { data: connectionData, error: connectionError } = await supabase.rpc('get_connection_requests', {
          user_id: user.id,
          request_type: 'active'
        })

        if (connectionError) throw connectionError

        const connection = connectionData?.find((conn: ConnectionData) => conn.id === connectionId)
        
        if (!connection) {
          setError('Connection not found or access denied')
          setLoading(false)
          return
        }

        setConnection(connection)

        // Get conversation ID for the new system
        if (useNewSystem) {
          const convId = await ChatAPI.getConversationByConnectionId(connectionId)
          if (convId) {
            setConversationId(convId)
          } else {
            console.warn('No conversation found for connection, falling back to old system')
            setUseNewSystem(false)
          }
        }
      } catch (err) {
        console.error('Error initializing chat:', err)
        setError('Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [connectionId, useNewSystem])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ChatAPI.cleanup()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading chat...</div>
        </div>
      </div>
    )
  }

  if (error || !connection || !currentUser) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Unable to load chat</h2>
            <p className="text-muted-foreground">{error || 'Connection not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const otherUserName = connection.sender_id === currentUser.id 
    ? connection.receiver_name 
    : connection.sender_name

  const currentUserName = connection.sender_id === currentUser.id 
    ? connection.sender_name 
    : connection.receiver_name

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-6">
        <div className="h-[600px] border border-input rounded-lg overflow-hidden">
          {useNewSystem && conversationId ? (
            <ConversationChat 
              conversationId={conversationId}
              currentUserId={currentUser.id}
              currentUserName={currentUserName}
              otherUserName={otherUserName}
            />
          ) : (
            <Chat 
              connectionId={connectionId}
              currentUserId={currentUser.id}
              currentUserName={currentUserName}
              otherUserName={otherUserName}
            />
          )}
        </div>
      </div>
    </div>
  )
}