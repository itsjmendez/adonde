"use client"

import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { ConnectionRequest, getConnectionRequests, respondToConnectionRequest } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ConnectionsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'requests' | 'messages'>('requests')
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<{[key: string]: 'accepting' | 'declining'}>({})
  const [tabCounts, setTabCounts] = useState<{requests: number, messages: number}>({
    requests: 0,
    messages: 0
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Connections
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with roommates and manage your conversations
          </p>
        </div>

        <div className="mb-8 border-b">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('requests')}
              className={`py-3 px-1 text-base font-medium border-b-2 transition-colors ${
                activeTab === 'requests' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span>Requests</span>
                {tabCounts.requests > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.requests}
                  </span>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`py-3 px-1 text-base font-medium border-b-2 transition-colors ${
                activeTab === 'messages' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Messages</span>
                {tabCounts.messages > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {tabCounts.messages}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
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
          <div className="text-center py-16">
            <div className="max-w-sm mx-auto">
              {activeTab === 'requests' && (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-2-8h.01M15 12h.01m-2.5-5L18 12l-5.5 5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No pending requests</h3>
                  <p className="text-sm text-muted-foreground">New connection requests will appear here</p>
                </div>
              )}
              {activeTab === 'messages' && (
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No conversations yet</h3>
                  <p className="text-sm text-muted-foreground">Start connecting with roommates to begin chatting</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {connectionRequests.map((request) => {
              const isRequests = activeTab === 'requests'
              const isMessages = activeTab === 'messages'
              
              let displayName, avatarUrl
              
              if (isRequests) {
                // Show the sender (person who sent you the request)
                displayName = request.sender_name
                avatarUrl = request.sender_avatar_url
              } else if (isMessages) {
                // Show the other person in the conversation (not yourself)
                if (currentUserId === request.sender_id) {
                  // You are the sender, so show the receiver
                  displayName = request.receiver_name
                  avatarUrl = request.receiver_avatar_url
                } else {
                  // You are the receiver, so show the sender
                  displayName = request.sender_name
                  avatarUrl = request.sender_avatar_url
                }
              }
              
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
                          {isMessages && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{displayName || 'Unknown User'}</h3>
                            {isMessages && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Online</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatTimeAgo(request.created_at)}</span>
                            {isMessages && (
                              <>
                                <span>•</span>
                                <span className="text-gray-600">Last message preview...</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isRequests && request.status === 'pending' && (
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
                        
                        {isMessages && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleMessage(request.id)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Chat
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isRequests && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-200">
                        <p className="text-sm text-gray-700 italic">"{request.message}"</p>
                      </div>
                    )}
                    
                    {isMessages && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between text-xs text-blue-700">
                          <span>Recent Activity</span>
                          <span>2 unread messages</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}