import { supabase } from './supabase'

export interface GeocodingResult {
  latitude: number
  longitude: number
  formatted_address: string
}

export interface CachedLocation {
  id: string
  location_text: string
  latitude: number
  longitude: number
  formatted_address?: string
  created_at: string
}

export class GeocodingService {
  static async geocodeLocation(locationText: string): Promise<GeocodingResult | null> {
    try {
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: locationText }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Geocoding request failed')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }


  static async updateUserSearchLocation(
    userId: string, 
    locationText: string, 
    radius: number = 25
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const geocodingResult = await this.geocodeLocation(locationText)
      if (!geocodingResult) {
        return { success: false, error: 'Location not found' }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          search_location: locationText,
          search_radius: radius,
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude
        })
        .eq('id', userId)

      if (error) {
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }
}