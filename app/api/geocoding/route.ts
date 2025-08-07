import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create server-side Supabase client with user context
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseClient()
  
  try {
    const { location } = await request.json()
    
    if (!location || typeof location !== 'string') {
      return NextResponse.json(
        { error: 'Location is required and must be a string' },
        { status: 400 }
      )
    }

    const locationText = location.toLowerCase().trim()

    // First, check the cache
    const { data: cachedData, error: cacheError } = await supabase
      .from('geocoding_cache')
      .select('*')
      .eq('location_text', locationText)
      .single()

    if (!cacheError && cachedData) {
      console.log(`🎯 CACHE HIT: Using cached coordinates for "${locationText}"`)
      return NextResponse.json({
        latitude: cachedData.latitude,
        longitude: cachedData.longitude,
        formatted_address: cachedData.formatted_address || location
      })
    }

    console.log(`🌐 CACHE MISS: Calling OpenCage API for "${locationText}"`)

    // If not in cache, call OpenCage API
    const apiKey = process.env.OPENCAGE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      )
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${apiKey}&limit=1&no_annotations=1`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`OpenCage API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    const result = data.results[0]
    const geocodingResult = {
      latitude: result.geometry.lat,
      longitude: result.geometry.lng,
      formatted_address: result.formatted
    }

    // Cache the result
    const { error: insertError } = await supabase
      .from('geocoding_cache')
      .insert([{
        location_text: locationText,
        latitude: geocodingResult.latitude,
        longitude: geocodingResult.longitude,
        formatted_address: geocodingResult.formatted_address
      }])
    
    if (insertError) {
      console.error('Error caching geocoding result:', insertError)
      // Log more details for debugging
      console.error('Insert data:', {
        location_text: locationText,
        latitude: geocodingResult.latitude,
        longitude: geocodingResult.longitude,
        formatted_address: geocodingResult.formatted_address
      })
    } else {
      console.log(`✅ Successfully cached location: "${locationText}"`)
    }

    return NextResponse.json(geocodingResult)
  } catch (error) {
    console.error('Geocoding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}