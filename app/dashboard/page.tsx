"use client"

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LocationSearch } from "@/components/location-search";
import { RoommateCard } from "@/components/roommate-card";
import { Profile, searchRoommates } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [roommates, setRoommates] = useState<(Profile & { distance: number })[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [])

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
    } catch (err) {
      console.error("Search error:", err)
      setError("Failed to search for roommates. Please try again.")
      setRoommates([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleConnect = async (profileId: string) => {
    // TODO: Implement connection logic
    console.log("Connect with profile:", profileId)
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

        {hasSearched && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-medium mb-2">
                {isSearching ? "Searching..." : `Found ${roommates.length} roommate${roommates.length !== 1 ? 's' : ''}`}
              </h2>
            </div>

            {roommates.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roommates.map((profile) => (
                  <RoommateCard
                    key={profile.id}
                    profile={profile}
                    onConnect={handleConnect}
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
      </div>
    </div>
  );
}