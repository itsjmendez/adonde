import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface Params {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()

    if (!status || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be accepted or declined' }, { status: 400 })
    }

    // Call the database function to respond to connection request
    const { data, error } = await supabase.rpc('respond_to_connection_request', {
      request_id: params.id,
      response: status
    })

    if (error) {
      console.error('Error responding to connection request:', error)
      return NextResponse.json({ error: 'Failed to update connection request' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Connection request not found or already processed' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}