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
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'active'>('received')
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabCounts, setTabCounts] = useState<{received: number, sent: number, active: number}>({
    received: 0,
    sent: 0,
    active: 0
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
      const [receivedResult, sentResult, activeResult] = await Promise.all([
        getConnectionRequests('received'),
        getConnectionRequests('sent'),
        getConnectionRequests('active')
      ])

      setTabCounts({
        received: receivedResult.data?.length || 0,
        sent: sentResult.data?.length || 0,
        active: activeResult.data?.length || 0
      })
    } catch (err) {
      console.error('Error fetching connection counts:', err)
    }
  }

  const fetchConnectionRequests = async (type: 'received' | 'sent' | 'active') => {
    setLoading(true)
    setError(null)
    
    const { data, error } = await getConnectionRequests(type)
    
    if (error) {
      console.error('Error fetching connection requests:', error)
      setError('Failed to load connection requests')
    } else {
      setConnectionRequests(data || [])
    }
    
    setLoading(false)
  }

  const handleResponse = async (requestId: string, response: 'accepted' | 'declined') => {
    try {
      const { error } = await respondToConnectionRequest(requestId, response)
      
      if (error) {
        console.error('Error responding to request:', error)
        setError('Failed to respond to connection request')
      } else {
        // Refresh both the connection requests and counts
        fetchAllConnectionCounts()
        fetchConnectionRequests(activeTab)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
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
          <p className="text-muted-foreground">
            Manage your connection requests and active chats
          </p>
        </div>

        <div className="mb-8 border-b">
          <nav className="-mb-px flex space-x-6">
            <button 
              onClick={() => setActiveTab('received')}
              className={`py-2 text-sm font-medium border-b-2 ${
                activeTab === 'received' 
                  ? 'border-foreground' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Received ({tabCounts.received})
            </button>
            <button 
              onClick={() => setActiveTab('active')}
              className={`py-2 text-sm font-medium border-b-2 ${
                activeTab === 'active' 
                  ? 'border-foreground' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({tabCounts.active})
            </button>
            <button 
              onClick={() => setActiveTab('sent')}
              className={`py-2 text-sm font-medium border-b-2 ${
                activeTab === 'sent' 
                  ? 'border-foreground' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Sent ({tabCounts.sent})
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading connection requests...</p>
          </div>
        ) : connectionRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {activeTab === 'received' && 'No pending connection requests'}
              {activeTab === 'sent' && 'No sent connection requests'}
              {activeTab === 'active' && 'No active connections'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {connectionRequests.map((request) => {
              const isReceived = activeTab === 'received'
              const isSent = activeTab === 'sent'
              const isActive = activeTab === 'active'
              
              let displayName, avatarUrl
              
              if (isReceived) {
                // Show the sender (person who sent you the request)
                displayName = request.sender_name
                avatarUrl = request.sender_avatar_url
              } else if (isSent) {
                // Show the receiver (person you sent the request to)
                displayName = request.receiver_name
                avatarUrl = request.receiver_avatar_url
              } else if (isActive) {
                // Show the other person in the connection (not yourself)
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
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={displayName || 'User'} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {displayName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{displayName || 'Unknown User'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTimeAgo(request.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      {isReceived && request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleResponse(request.id, 'accepted')}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleResponse(request.id, 'declined')}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {activeTab === 'sent' && (
                        <div className="text-sm text-muted-foreground capitalize">
                          {request.status}
                        </div>
                      )}
                      
                      {activeTab === 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMessage(request.id)}
                        >
                          Message
                        </Button>
                      )}
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-md">
                      <p className="text-sm">"{request.message}"</p>
                    </div>
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