"use client"

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocationSearch } from "@/components/location-search";
import { RoommateCard } from "@/components/roommate-card";
import { ConnectionRequestModal } from "@/components/connection-request-modal";
import { Profile, searchRoommates, getConnectionStatus, respondToConnectionRequest } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { saveDashboardSearchState, getDashboardSearchState, updateCachedConnectionStatus } from "@/lib/dashboard-cache";

export default function DashboardPage() {
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
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Find roommates
          </h1>
          <p className="text-muted-foreground">
            Discover compatible roommates in your area
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <LocationSearch
              onLocationSelect={handleLocationSearch}
              isSearching={isSearching}
              initialLocation={lastSearchParams?.location || ""}
              initialRadius={lastSearchParams?.radius || 25}
            />
          </CardContent>
        </Card>

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
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-medium mb-2">No roommates found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try expanding your search radius or searching a different location.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!hasSearched && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-medium mb-2">Start your search</h3>
              <p className="text-muted-foreground">
                Enter a location above to find compatible roommates in your area.
              </p>
            </CardContent>
          </Card>
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
  );
}