import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // received, sent, active

    // Call the database function to get connection requests
    const { data, error } = await supabase.rpc('get_connection_requests', {
      user_id: user.id,
      request_type: type
    })

    if (error) {
      console.error('Error fetching connection requests:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiver_id, message } = await request.json()

    if (!receiver_id || !message) {
      return NextResponse.json({ error: 'receiver_id and message are required' }, { status: 400 })
    }

    // Call the database function to send connection request
    const { data, error } = await supabase.rpc('send_connection_request', {
      receiver_user_id: receiver_id,
      request_message: message
    })

    if (error) {
      console.error('Error sending connection request:', error)
      return NextResponse.json({ error: error.message || 'Failed to send connection request' }, { status: 400 })
    }

    return NextResponse.json({ success: true, request_id: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}