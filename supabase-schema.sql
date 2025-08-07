-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  age INTEGER,
  location TEXT,
  rent_budget_min INTEGER,
  rent_budget_max INTEGER,
  move_in_date DATE,
  lifestyle_preferences JSONB DEFAULT '{}',
  looking_for TEXT[], -- array of strings like ["male", "female", "any"]
  amenities_wanted TEXT[], -- array of amenities
  deal_breakers TEXT[], -- array of deal breakers
  is_profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add location search fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_radius INTEGER DEFAULT 25;

-- Create geocoding cache table
CREATE TABLE IF NOT EXISTS geocoding_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_text TEXT NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  formatted_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster geocoding cache lookups
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_location ON geocoding_cache(location_text);

-- Create spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_coordinates ON profiles(latitude, longitude);

-- Enable Row Level Security on geocoding_cache
ALTER TABLE geocoding_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read from geocoding cache
CREATE POLICY "All users can read geocoding cache" ON geocoding_cache
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert into geocoding cache
CREATE POLICY "All users can insert into geocoding cache" ON geocoding_cache
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL(10, 8),
  lon1 DECIMAL(11, 8),
  lat2 DECIMAL(10, 8),
  lon2 DECIMAL(11, 8)
) RETURNS DECIMAL AS $$
DECLARE
  R DECIMAL := 3959; -- Earth's radius in miles
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := RADIANS(lat2 - lat1);
  dLon := RADIANS(lon2 - lon1);
  
  a := SIN(dLat/2) * SIN(dLat/2) + 
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
       SIN(dLon/2) * SIN(dLon/2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to search for roommates within a radius
CREATE OR REPLACE FUNCTION search_roommates_by_location(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  radius_miles INTEGER DEFAULT 25,
  result_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  age INTEGER,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  search_location TEXT,
  search_radius INTEGER,
  rent_budget_min INTEGER,
  rent_budget_max INTEGER,
  move_in_date DATE,
  lifestyle_preferences JSONB,
  looking_for TEXT[],
  amenities_wanted TEXT[],
  deal_breakers TEXT[],
  is_profile_complete BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.age,
    p.location,
    p.latitude,
    p.longitude,
    p.search_location,
    p.search_radius,
    p.rent_budget_min,
    p.rent_budget_max,
    p.move_in_date,
    p.lifestyle_preferences,
    p.looking_for,
    p.amenities_wanted,
    p.deal_breakers,
    p.is_profile_complete,
    p.created_at,
    p.updated_at,
    calculate_distance(user_lat, user_lng, p.latitude, p.longitude) as distance
  FROM profiles p
  WHERE 
    p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND p.is_profile_complete = true
    AND p.id != auth.uid() -- Exclude the current user
    AND calculate_distance(user_lat, user_lng, p.latitude, p.longitude) <= radius_miles
  ORDER BY distance ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;