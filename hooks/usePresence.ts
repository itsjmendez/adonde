import { useState, useEffect, useCallback } from 'react'
import { ChatAPI, UserPresence } from '@/lib/chat-api'

export function usePresence() {
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>('online')
  const [updating, setUpdating] = useState(false)

  // Auto-update presence based on tab visibility and user activity
  useEffect(() => {
    const handleVisibilityChange = () => {
      const newStatus = document.hidden ? 'away' : 'online'
      updateStatus(newStatus)
    }

    const handleUserActivity = () => {
      if (status === 'away' && !document.hidden) {
        updateStatus('online')
      }
    }

    // Set initial status
    updateStatus('online')

    // Listen to visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Listen to user activity to switch from away to online
    document.addEventListener('mousemove', handleUserActivity)
    document.addEventListener('keypress', handleUserActivity)
    document.addEventListener('scroll', handleUserActivity)

    // Set offline when page unloads
    const handleBeforeUnload = () => {
      // Use synchronous approach for page unload
      navigator.sendBeacon('/api/presence', JSON.stringify({ status: 'offline' }))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('mousemove', handleUserActivity)
      document.removeEventListener('keypress', handleUserActivity)
      document.removeEventListener('scroll', handleUserActivity)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      // Set offline when component unmounts
      updateStatus('offline')
    }
  }, [status])

  const updateStatus = useCallback(async (newStatus: 'online' | 'away' | 'offline') => {
    if (newStatus === status || updating) return

    setUpdating(true)
    const success = await ChatAPI.updatePresence(newStatus)
    
    if (success) {
      setStatus(newStatus)
    }
    
    setUpdating(false)
  }, [status, updating])

  return {
    status,
    updateStatus,
    updating
  }
}

export function useConversationPresence(conversationId: string) {
  const [presence, setPresence] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!conversationId) {
      setPresence([])
      setLoading(false)
      return
    }

    // Subscribe to presence updates for this conversation
    ChatAPI.subscribeToPresence(conversationId, setPresence)

    // Load initial presence
    ChatAPI.getConversationPresence(conversationId)
      .then(setPresence)
      .finally(() => setLoading(false))

    return () => {
      ChatAPI.unsubscribeFromPresence(conversationId, setPresence)
    }
  }, [conversationId])

  const getStatusDisplay = (userPresence: UserPresence): string => {
    const { status, last_seen } = userPresence
    
    if (status === 'online') return 'Online'
    if (status === 'away') return 'Away'
    
    const lastSeenDate = new Date(last_seen)
    const now = new Date()
    const diffMs = now.getTime() - lastSeenDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return lastSeenDate.toLocaleDateString()
  }

  return {
    presence,
    loading,
    getStatusDisplay
  }
}