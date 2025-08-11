"use client"

import { useEffect, useState } from "react";
import { ConnectionRequest, getConnectionRequests, respondToConnectionRequest } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { RequestsLayout } from "@/components/requests/RequestsLayout";

export default function RequestsPage() {
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<{[key: string]: 'accepting' | 'declining'}>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
    fetchConnectionRequests()
  }, [])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const fetchConnectionRequests = async () => {
    setLoading(true)
    setError(null)
    
    const { data, error } = await getConnectionRequests('received')
    
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
        
        setError(null)
        fetchConnectionRequests()
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

  const handleRequestSelect = (requestId: string) => {
    // This will be handled by the RequestsLayout component
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)]">
        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Requests Layout */}
        {currentUserId ? (
          <RequestsLayout
            requests={connectionRequests}
            currentUserId={currentUserId}
            loading={loading}
            onRequestSelect={handleRequestSelect}
            onResponse={handleResponse}
            optimisticUpdates={optimisticUpdates}
            fullScreen={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Loading user session...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}