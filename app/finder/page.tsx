"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocationSearch } from "@/components/location-search";
import { RoommateCard } from "@/components/roommate-card";
import { ConnectionRequestModal } from "@/components/connection-request-modal";
import { AppLayout } from "@/components/AppLayout";
import { Profile, searchRoommates, getConnectionStatus, respondToConnectionRequest } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { saveDashboardSearchState, getDashboardSearchState, updateCachedConnectionStatus } from "@/lib/dashboard-cache";

export default function FinderPage() {
  const [roommates, setRoommates] = useState<(Profile & { distance: number })[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, { status: 'none' | 'pending_sent' | 'pending_received' | 'connected', requestId?: string }>>({})
  const [lastSearchParams, setLastSearchParams] = useState<{location: string, latitude: number, longitude: number, radius: number} | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
    
    // Restore cached search state
    restoreCachedSearchState()
  }, [])

  const restoreCachedSearchState = async () => {
    const cachedState = getDashboardSearchState()
    if (cachedState) {
      setRoommates(cachedState.roommates)
      setConnectionStatuses(cachedState.connectionStatuses)
      setLastSearchParams({
        location: cachedState.location,
        latitude: cachedState.latitude,
        longitude: cachedState.longitude,
        radius: cachedState.radius
      })
      setHasSearched(true)
      console.log('Restored search results from cache:', cachedState.location)
      
      // Refresh connection statuses to ensure they're up-to-date
      if (cachedState.roommates.length > 0) {
        console.log('Refreshing connection statuses for cached results...')
        const searchParams = {
          location: cachedState.location,
          latitude: cachedState.latitude,
          longitude: cachedState.longitude,
          radius: cachedState.radius
        }
        await fetchConnectionStatuses(
          cachedState.roommates.map(profile => profile.id),
          cachedState.roommates,
          searchParams
        )
      }
    }
  }

  const handleLocationSearch = async (
    location: string, 
    latitude: number, 
    longitude: number, 
    radius: number
  ) => {
    if (!currentUser) {
      setError("Please log in to search for roommates")
      return
    }

    setIsSearching(true)
    setError(null)
    setHasSearched(true)

    try {
      // Update user's search preferences with coordinates we already have
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          search_location: location,
          search_radius: radius,
          latitude: latitude,
          longitude: longitude
        })
        .eq('id', currentUser.id)
      
      if (updateError) {
        console.error('Error updating user search location:', updateError)
      }

      // Search for roommates
      const { data, error: searchError } = await searchRoommates(latitude, longitude, radius)
      
      if (searchError) {
        throw searchError
      }

      setRoommates(data || [])
      
      // Fetch connection statuses for all found roommates
      if (data && data.length > 0) {
        await fetchConnectionStatuses(data.map(profile => profile.id))
      }

      // Store search parameters for future use
      setLastSearchParams({ location, latitude, longitude, radius })
      
      // Save search state to cache
      saveDashboardSearchState({
        location,
        latitude,
        longitude,
        radius,
        roommates: data || [],
        connectionStatuses: {}  // Will be updated when connection statuses are fetched
      })
    } catch (err) {
      console.error("Search error:", err)
      setError("Failed to search for roommates. Please try again.")
      setRoommates([])
    } finally {
      setIsSearching(false)
    }
  }

  const fetchConnectionStatuses = async (profileIds: string[], currentRoommates?: (Profile & { distance: number })[], currentSearchParams?: {location: string, latitude: number, longitude: number, radius: number}) => {
    try {
      const statusPromises = profileIds.map(async (profileId) => {
        const { data: statusData } = await getConnectionStatus(profileId)
        return { profileId, statusData: statusData || { status: 'none' } }
      })
      
      const statuses = await Promise.all(statusPromises)
      const statusMap: Record<string, { status: 'none' | 'pending_sent' | 'pending_received' | 'connected', requestId?: string }> = {}
      
      statuses.forEach(({ profileId, statusData }) => {
        statusMap[profileId] = statusData
      })
      
      setConnectionStatuses(statusMap)
      
      // Update cache with connection statuses
      const searchParams = currentSearchParams || lastSearchParams
      const roommateList = currentRoommates || roommates
      
      if (searchParams && roommateList) {
        saveDashboardSearchState({
          location: searchParams.location,
          latitude: searchParams.latitude,
          longitude: searchParams.longitude,
          radius: searchParams.radius,
          roommates: roommateList,
          connectionStatuses: statusMap
        })
      }
    } catch (err) {
      console.error('Error fetching connection statuses:', err)
    }
  }

  const handleConnect = async (profileId: string) => {
    const profile = roommates.find(p => p.id === profileId)
    if (!profile) return
    
    setSelectedProfile(profile)
    setIsModalOpen(true)
  }

  const handleConnectionSuccess = () => {
    const displayName = selectedProfile?.display_name || selectedProfile?.full_name || 'the user'
    setSuccessMessage(`Connection request sent to ${displayName}!`)
    
    // Update the connection status for this profile
    if (selectedProfile) {
      const newStatus = { status: 'pending_sent' as const }
      setConnectionStatuses(prev => ({
        ...prev,
        [selectedProfile.id]: newStatus
      }))
      
      // Update cached status
      updateCachedConnectionStatus(selectedProfile.id, newStatus)
    }
    
    setSelectedProfile(null)
    setIsModalOpen(false)
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleMessage = (profileId: string) => {
    // Navigate to chat page - will be implemented when messaging system is ready
    console.log('Navigate to chat with:', profileId)
    // router.push(`/chat/${profileId}`)
  }

  const handleViewProfile = (profileId: string) => {
    // Navigate to profile view - will be implemented when profile view is ready
    console.log('View profile:', profileId)
    // router.push(`/profile/view/${profileId}`)
  }

  const handleAcceptRequest = async (profileId: string, requestId: string) => {
    try {
      const { error } = await respondToConnectionRequest(requestId, 'accepted')
      
      if (error) {
        console.error('Error accepting request:', error)
        setError('Failed to accept connection request')
      } else {
        // Update connection status to connected
        const newStatus = { status: 'connected' as const, requestId }
        setConnectionStatuses(prev => ({
          ...prev,
          [profileId]: newStatus
        }))
        
        // Update cached status
        updateCachedConnectionStatus(profileId, newStatus)
        
        const profile = roommates.find(p => p.id === profileId)
        const displayName = profile?.display_name || profile?.full_name || 'the user'
        setSuccessMessage(`Connection accepted! You're now connected with ${displayName}`)
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    }
  }

  const handleDeclineRequest = async (profileId: string, requestId: string) => {
    try {
      const { error } = await respondToConnectionRequest(requestId, 'declined')
      
      if (error) {
        console.error('Error declining request:', error)
        setError('Failed to decline connection request')
      } else {
        // Update connection status to none (request is declined and removed)
        const newStatus = { status: 'none' as const }
        setConnectionStatuses(prev => ({
          ...prev,
          [profileId]: newStatus
        }))
        
        // Update cached status
        updateCachedConnectionStatus(profileId, newStatus)
        
        setSuccessMessage('Connection request declined')
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('An unexpected error occurred')
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Section */}
        <div className="border-b border-gray-200 bg-white px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Find Your Perfect Roommate</h1>
              <p className="text-lg text-muted-foreground mb-4">
                Search for compatible roommates in your area using our location-based matching
              </p>
              <div className="flex items-center justify-center text-sm text-muted-foreground space-x-6">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Enter your location
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Set search radius
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Browse & connect
                </div>
              </div>
            </div>
            
            {/* Search Card */}
            <Card>
              <CardContent className="p-6">
                <LocationSearch
                  onLocationSelect={handleLocationSearch}
                  isSearching={isSearching}
                  initialLocation={lastSearchParams?.location || ""}
                  initialRadius={lastSearchParams?.radius || 25}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto w-full">

        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="p-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <p className="text-sm text-green-700">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        {hasSearched && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-medium mb-2">
                {isSearching ? "Searching..." : `Found ${roommates.length} roommate${roommates.length !== 1 ? 's' : ''}`}
              </h2>
              {lastSearchParams && (
                <p className="text-sm text-muted-foreground">
                  Near {lastSearchParams.location} • Within {lastSearchParams.radius} miles
                </p>
              )}
            </div>

            {roommates.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roommates.map((profile) => (
                  <RoommateCard
                    key={profile.id}
                    profile={profile}
                    connectionStatus={connectionStatuses[profile.id] || { status: 'none' }}
                    onConnect={handleConnect}
                    onMessage={handleMessage}
                    onViewProfile={handleViewProfile}
                    onAcceptRequest={handleAcceptRequest}
                    onDeclineRequest={handleDeclineRequest}
                  />
                ))}
              </div>
            )}

            {roommates.length === 0 && !isSearching && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium mb-2">No roommates found in this area</h3>
                  <p className="text-muted-foreground mb-6">
                    Try expanding your search radius or searching in a different location. There might be great roommates just a bit further away!
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>💡 <strong>Tips:</strong></p>
                    <p>• Increase your search radius</p>
                    <p>• Try nearby cities or neighborhoods</p>
                    <p>• Check back later as new users join daily</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!hasSearched && (
          <div className="text-center py-16">
            <div className="max-w-lg mx-auto">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Ready to find your roommate?</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Enter your location above to discover compatible roommates nearby. Our smart matching finds people who share your lifestyle and preferences.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-1">Verified Profiles</h4>
                  <p className="text-muted-foreground">All users go through email verification</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-1">Smart Matching</h4>
                  <p className="text-muted-foreground">Find people with compatible lifestyles</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h4 className="font-medium mb-1">Secure Chat</h4>
                  <p className="text-muted-foreground">Connect safely with built-in messaging</p>
                </div>
              </div>
            </div>
          </div>
        )}

            <ConnectionRequestModal
              profile={selectedProfile}
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false)
                setSelectedProfile(null)
              }}
              onSuccess={handleConnectionSuccess}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}