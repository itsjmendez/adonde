import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatAPI, TypingIndicator } from '@/lib/chat-api'

export function useTypingIndicators(conversationId: string) {
  const [typers, setTypers] = useState<TypingIndicator[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!conversationId) return

    // Subscribe to typing indicators for this conversation
    ChatAPI.subscribeToTyping(conversationId, setTypers)

    // Load initial typers
    ChatAPI.getTypers(conversationId).then(setTypers)

    return () => {
      ChatAPI.unsubscribeFromTyping(conversationId, setTypers)
    }
  }, [conversationId])

  const startTyping = useCallback(async () => {
    if (isTyping) return // Already typing

    setIsTyping(true)
    await ChatAPI.startTyping(conversationId)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Auto-stop typing after 8 seconds (before the 10-second server timeout)
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 8000)
  }, [conversationId, isTyping])

  const stopTyping = useCallback(async () => {
    if (!isTyping) return // Not typing

    setIsTyping(false)
    await ChatAPI.stopTyping(conversationId)

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, isTyping])

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      startTyping()
    } else {
      // Extend typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 8000)
    }
  }, [startTyping, stopTyping, isTyping])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        ChatAPI.stopTyping(conversationId)
      }
    }
  }, [conversationId, isTyping])

  return {
    typers,
    isTyping,
    startTyping,
    stopTyping,
    handleTyping
  }
}