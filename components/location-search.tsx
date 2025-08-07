"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { GeocodingService } from "@/lib/geocoding"

interface LocationSearchProps {
  onLocationSelect: (location: string, latitude: number, longitude: number, radius: number) => void
  initialLocation?: string
  initialRadius?: number
  isSearching?: boolean
}

export function LocationSearch({ 
  onLocationSelect, 
  initialLocation = "", 
  initialRadius = 25,
  isSearching = false 
}: LocationSearchProps) {
  const [location, setLocation] = useState(initialLocation)
  const [radius, setRadius] = useState([initialRadius])
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    if (!location.trim()) {
      setError("Please enter a location")
      return
    }

    setIsGeocoding(true)
    setError(null)

    try {
      const result = await GeocodingService.geocodeLocation(location.trim())
      if (result) {
        onLocationSelect(location.trim(), result.latitude, result.longitude, radius[0])
      } else {
        setError("Location not found. Please try a different location.")
      }
    } catch (err) {
      setError("Failed to search location. Please try again.")
      console.error("Geocoding error:", err)
    } finally {
      setIsGeocoding(false)
    }
  }, [location, radius, onLocationSelect])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-64 space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Enter city, zip code, or address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGeocoding || isSearching}
          />
        </div>
        
        <div className="min-w-32 space-y-2">
          <Label htmlFor="radius">
            Radius: {radius[0]} miles
          </Label>
          <Slider
            id="radius"
            min={5}
            max={100}
            step={5}
            value={radius}
            onValueChange={setRadius}
            disabled={isGeocoding || isSearching}
            className="w-full"
          />
        </div>
        
        <Button 
          onClick={handleSearch}
          disabled={!location.trim() || isGeocoding || isSearching}
          className="min-w-24"
        >
          {isGeocoding ? "Searching..." : "Search"}
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}