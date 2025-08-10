"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { ConnectionRequest, getConnectionRequests, respondToConnectionRequest } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { AppLayout } from "@/components/AppLayout";

export default function ConnectionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'requests' | 'messages'>(
    tabParam === 'messages' ? 'messages' : 'requests'
  )
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<{[key: string]: 'accepting' | 'declining'}>({})
  const [tabCounts, setTabCounts] = useState<{requests: number, messages: number}>({
    requests: 0,
    messages: 0
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
    fetchAllConnectionCounts()
    fetchConnectionRequests(activeTab)
  }, [activeTab])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const fetchAllConnectionCounts = async () => {
    try {
      const [requestsResult, messagesResult] = await Promise.all([
        getConnectionRequests('received'),
        getConnectionRequests('active')
      ])

      setTabCounts({
        requests: requestsResult.data?.length || 0,
        messages: messagesResult.data?.length || 0
      })
    } catch (err) {
      console.error('Error fetching connection counts:', err)
    }
  }

  const fetchConnectionRequests = async (type: 'requests' | 'messages') => {
    setLoading(true)
    setError(null)
    
    // Map new tab names to API types
    const apiType = type === 'requests' ? 'received' : 'active'
    const { data, error } = await getConnectionRequests(apiType)
    
    if (error) {
      console.error('Error fetching connection requests:', error)
      setError('Failed to load connection requests')
    } else {
      setConnectionRequests(data || [])
    }
    
    setLoading(false)
  }

  const handleResponse = async (requestId: string, response: 'accepted' | 'declined') => {
    // Optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [requestId]: response === 'accepted' ? 'accepting' : 'declining' }))
    
    try {
      const { error } = await respondToConnectionRequest(requestId, response)
      
      if (error) {
        console.error('Error responding to request:', error)
        setError('Failed to respond to connection request')
        // Revert optimistic update
        setOptimisticUpdates(prev => {
          const { [requestId]: _, ...rest } = prev
          return rest
        })
      } else {
        // Success - remove from optimistic updates and refresh
        setOptimisticUpdates(prev => {
          const { [requestId]: _, ...rest } = prev
          return rest
        })
        
        // Show success message briefly
        const successMessage = response === 'accepted' ? 'Connection accepted!' : 'Request declined'
        setError(null)
        
        // Refresh both the connection requests and counts
        fetchAllConnectionCounts()
        fetchConnectionRequests(activeTab)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
      // Revert optimistic update
      setOptimisticUpdates(prev => {
        const { [requestId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleMessage = (connectionId: string) => {
    router.push(`/chat/${connectionId}`)
  }

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId)
  }


  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col overflow-hidden">


        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'messages' ? (
            <ChatLayout 
              conversations={connectionRequests}
              currentUserId={currentUserId || ''}
              loading={loading}
              onConversationSelect={handleConversationSelect}
            />
          ) : loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : connectionRequests.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-sm mx-auto text-center">
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-2-8h.01M15 12h.01m-2.5-5L18 12l-5.5 5" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No pending requests</h3>
                    <p className="text-sm text-muted-foreground">New connection requests will appear here</p>
                  </div>
                </div>
              </div>
          ) : activeTab === 'requests' ? (
            <div className="p-6 space-y-4 overflow-y-auto">
              {connectionRequests.map((request) => {
              const displayName = request.sender_name
              const avatarUrl = request.sender_avatar_url
              
              return (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={displayName || 'User'} 
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {displayName?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{displayName || 'Unknown User'}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatTimeAgo(request.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleResponse(request.id, 'accepted')}
                              disabled={!!optimisticUpdates[request.id]}
                            >
                              {optimisticUpdates[request.id] === 'accepting' ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Accepting...</span>
                                </div>
                              ) : (
                                'Accept'
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleResponse(request.id, 'declined')}
                              disabled={!!optimisticUpdates[request.id]}
                            >
                              {optimisticUpdates[request.id] === 'declining' ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Declining...</span>
                                </div>
                              ) : (
                                'Decline'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-200">
                      <p className="text-sm text-gray-700 italic">"{request.message}"</p>
                    </div>
                  </CardContent>
                </Card>
              )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}