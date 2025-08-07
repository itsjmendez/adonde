import { supabase } from './supabase'

export interface Profile {
  id: string
  email?: string
  full_name?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  age?: number
  location?: string
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