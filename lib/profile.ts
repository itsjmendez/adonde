import { supabase } from './supabase'

export interface ConnectionRequest {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  updated_at: string
  sender_name?: string
  sender_avatar_url?: string
  receiver_name?: string
  receiver_avatar_url?: string
}

export interface Profile {
  id: string
  email?: string
  full_name?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  age?: number
  location?: string
  latitude?: number
  longitude?: number
  search_location?: string
  search_radius?: number
  rent_budget_min?: number
  rent_budget_max?: number
  move_in_date?: string
  lifestyle_preferences?: Record<string, any>
  looking_for?: string[]
  amenities_wanted?: string[]
  deal_breakers?: string[]
  is_profile_complete?: boolean
  created_at?: string
  updated_at?: string
}

export async function getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

export async function createProfile(profile: Profile): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .insert([profile])
    .select()
    .single()

  return { data, error }
}

export async function checkProfileComplete(userId: string): Promise<{ isComplete: boolean; error: any }> {
  console.log('Checking profile completion for user:', userId);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('is_profile_complete')
    .eq('id', userId)
    .single()

  console.log('Profile check result:', { data, error });

  if (error) {
    // If profile doesn't exist, create it
    if (error.code === 'PGRST116') {
      console.log('Profile not found, creating...');
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            email: user.user.email,
            is_profile_complete: false 
          }]);
        
        if (createError) {
          console.error('Error creating profile:', createError);
          return { isComplete: false, error: createError };
        }
        return { isComplete: false, error: null };
      }
    }
    return { isComplete: false, error }
  }

  const isComplete = data?.is_profile_complete || false;
  console.log('Profile is complete:', isComplete);
  return { isComplete, error: null }
}

export async function searchRoommates(
  userLatitude: number,
  userLongitude: number,
  radiusMiles: number = 25,
  limit: number = 20
): Promise<{ data: (Profile & { distance: number })[] | null; error: any }> {
  const { data, error } = await supabase.rpc('search_roommates_by_location', {
    user_lat: userLatitude,
    user_lng: userLongitude,
    radius_miles: radiusMiles,
    result_limit: limit
  })

  return { data, error }
}

export async function getConnectionRequests(type: 'received' | 'sent' | 'active' = 'received'): Promise<{ data: ConnectionRequest[] | null; error: any }> {
  const { data, error } = await supabase.rpc('get_connection_requests', {
    user_id: (await supabase.auth.getUser()).data.user?.id,
    request_type: type
  })

  return { data, error }
}

export async function sendConnectionRequest(receiverId: string, message: string): Promise<{ data: string | null; error: any }> {
  const { data, error } = await supabase.rpc('send_connection_request', {
    receiver_user_id: receiverId,
    request_message: message
  })

  return { data, error }
}

export async function respondToConnectionRequest(requestId: string, response: 'accepted' | 'declined'): Promise<{ data: boolean | null; error: any }> {
  const { data, error } = await supabase.rpc('respond_to_connection_request', {
    request_id: requestId,
    response: response
  })

  return { data, error }
}

export async function getRequestSenderProfile(requestId: string): Promise<{ data: Profile | null; error: any }> {
  const { data, error } = await supabase.rpc('get_request_sender_profile', {
    request_id: requestId
  })

  if (error) return { data: null, error }
  
  // The function returns an array, but we expect a single profile
  const profile = data && data.length > 0 ? data[0] : null
  return { data: profile, error: null }
}

export async function getConnectionStatus(otherUserId: string): Promise<{ 
  data: { 
    status: 'none' | 'pending_sent' | 'pending_received' | 'connected'
    requestId?: string 
  } | null; 
  error: any 
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('connection_requests')
    .select('id, status, sender_id, receiver_id')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)

  if (error) return { data: null, error }

  if (!data || data.length === 0) {
    return { data: { status: 'none' }, error: null }
  }

  const connection = data[0]
  if (connection.status === 'accepted') {
    return { data: { status: 'connected', requestId: connection.id }, error: null }
  } else if (connection.status === 'pending') {
    if (connection.sender_id === user.id) {
      // You sent the request
      return { data: { status: 'pending_sent', requestId: connection.id }, error: null }
    } else {
      // You received the request
      return { data: { status: 'pending_received', requestId: connection.id }, error: null }
    }
  }

  return { data: { status: 'none' }, error: null }
}