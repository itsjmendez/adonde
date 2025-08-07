'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getProfile, Profile } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation';
import { UserAvatar } from '@/components/user-avatar';
import Link from 'next/link';
import { MapPin, Calendar, Edit, Settings } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await getProfile(user.id);
    
    if (error) {
      setError('Failed to load profile');
    } else {
      setProfile(data);
    }
    
    setLoading(false);
  };

  const formatLifestylePreferences = (preferences: Record<string, any> | undefined) => {
    if (!preferences) return [];
    
    const prefs = [];
    if (preferences.smoker) prefs.push('Smoker');
    if (preferences.petFriendly) prefs.push('Pet Friendly');
    if (preferences.nightOwl) prefs.push('Night Owl');
    if (preferences.earlyRiser) prefs.push('Early Riser');
    
    return prefs;
  };

  const getProfileCompleteness = (profile: Profile) => {
    const fields = [
      { key: 'full_name', label: 'Name', value: profile.full_name },
      { key: 'age', label: 'Age', value: profile.age },
      { key: 'bio', label: 'Bio', value: profile.bio },
      { key: 'location', label: 'Location', value: profile.location },
      { key: 'avatar_url', label: 'Profile Picture', value: profile.avatar_url },
      { key: 'rent_budget_min', label: 'Budget Range', value: profile.rent_budget_min || profile.rent_budget_max },
      { key: 'move_in_date', label: 'Move-in Date', value: profile.move_in_date },
    ];

    const completedFields = fields.filter(field => field.value && field.value.toString().trim() !== '');
    const missingFields = fields.filter(field => !field.value || field.value.toString().trim() === '');
    
    return {
      completedCount: completedFields.length,
      totalCount: fields.length,
      percentage: Math.round((completedFields.length / fields.length) * 100),
      missingFields: missingFields.map(field => field.label),
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={loadProfile} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No profile found</p>
          <Link href="/profile/setup">
            <Button className="mt-4">
              Set up profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const lifestylePrefs = formatLifestylePreferences(profile.lifestyle_preferences);
  const completeness = getProfileCompleteness(profile);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile information and preferences
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/profile/edit">
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
            <Link href="/profile/setup">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Completion Status */}
        {completeness.percentage < 100 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Complete Your Profile ({completeness.percentage}%)
                </h3>
                <p className="text-yellow-700 text-sm mb-4">
                  Add missing information to improve your roommate matches
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-yellow-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${completeness.percentage}%` }}
                  ></div>
                </div>
                
                {/* Missing Fields */}
                {completeness.missingFields.length > 0 && (
                  <div>
                    <p className="text-yellow-800 text-sm font-medium mb-2">Missing:</p>
                    <div className="flex flex-wrap gap-2">
                      {completeness.missingFields.map((field, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Link href="/profile/edit">
                <Button size="sm" className="ml-4">
                  Complete Profile
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border p-6 text-center">
              <div className="flex justify-center mb-4">
                <UserAvatar 
                  imageUrl={profile.avatar_url}
                  name={profile.display_name || profile.full_name}
                  size="xl"
                />
              </div>
              
              <h2 className="text-xl font-semibold mb-2">
                {profile.display_name || profile.full_name || 'No name set'}
              </h2>
              
              {profile.age && (
                <p className="text-muted-foreground mb-2">{profile.age} years old</p>
              )}
              
              {profile.location && (
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}

              <div className="flex justify-center">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile.is_profile_complete 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {profile.is_profile_complete ? 'Profile Complete' : 'Profile Incomplete'}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio Section */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">About</h3>
              {profile.bio ? (
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-muted-foreground italic">No bio added yet</p>
              )}
            </div>

            {/* Budget Information */}
            {(profile.rent_budget_min || profile.rent_budget_max) && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Budget Range</h3>
                <div className="text-2xl font-bold text-primary">
                  ${profile.rent_budget_min || '0'} - ${profile.rent_budget_max || '∞'} per month
                </div>
              </div>
            )}

            {/* Move-in Date */}
            {profile.move_in_date && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Move-in Date</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>{new Date(profile.move_in_date).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Lifestyle Preferences */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Lifestyle Preferences</h3>
              {lifestylePrefs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {lifestylePrefs.map((pref, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm"
                    >
                      {pref}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No preferences set</p>
              )}
            </div>

            {/* Looking For */}
            {profile.looking_for && profile.looking_for.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Looking For</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.looking_for.map((item, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {profile.amenities_wanted && profile.amenities_wanted.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Desired Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.amenities_wanted.map((amenity, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Deal Breakers */}
            {profile.deal_breakers && profile.deal_breakers.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Deal Breakers</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.deal_breakers.map((breaker, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                    >
                      {breaker}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}