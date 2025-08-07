'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getProfile, updateProfile, Profile } from '@/lib/profile';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Navigation } from "@/components/navigation";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';

export default function ProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    age: '',
    bio: '',
    location: '',
    rentBudgetMin: '',
    rentBudgetMax: '',
    moveInDate: '',
    smoker: false,
    petFriendly: false,
    nightOwl: false,
    earlyRiser: false,
    lookingFor: '',
    amenitiesWanted: '',
    dealBreakers: '',
    avatarUrl: '',
  });

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
    } else if (data) {
      setProfile(data);
      
      // Parse full name into first and last name
      const nameParts = data.full_name?.split(' ') || ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        firstName,
        lastName,
        displayName: data.display_name || '',
        age: data.age?.toString() || '',
        bio: data.bio || '',
        location: data.location || '',
        rentBudgetMin: data.rent_budget_min?.toString() || '',
        rentBudgetMax: data.rent_budget_max?.toString() || '',
        moveInDate: data.move_in_date || '',
        smoker: data.lifestyle_preferences?.smoker || false,
        petFriendly: data.lifestyle_preferences?.petFriendly || false,
        nightOwl: data.lifestyle_preferences?.nightOwl || false,
        earlyRiser: data.lifestyle_preferences?.earlyRiser || false,
        lookingFor: data.looking_for?.join(', ') || '',
        amenitiesWanted: data.amenities_wanted?.join(', ') || '',
        dealBreakers: data.deal_breakers?.join(', ') || '',
        avatarUrl: data.avatar_url || '',
      });
    }
    
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const lifestylePreferences = {
        smoker: formData.smoker,
        petFriendly: formData.petFriendly,
        nightOwl: formData.nightOwl,
        earlyRiser: formData.earlyRiser,
      };

      // For now, just store the local URL. In a real app, you'd upload to a storage service like Supabase Storage
      let avatarUrl = formData.avatarUrl;
      if (avatarFile) {
        // In a real implementation, upload to Supabase Storage here
        // For demo purposes, we'll keep the blob URL
        avatarUrl = formData.avatarUrl;
      }

      const profileUpdates = {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        display_name: formData.displayName || formData.firstName,
        age: formData.age ? parseInt(formData.age) : undefined,
        bio: formData.bio,
        location: formData.location,
        rent_budget_min: formData.rentBudgetMin ? parseInt(formData.rentBudgetMin) : undefined,
        rent_budget_max: formData.rentBudgetMax ? parseInt(formData.rentBudgetMax) : undefined,
        move_in_date: formData.moveInDate || undefined,
        avatar_url: avatarUrl,
        lifestyle_preferences: lifestylePreferences,
        looking_for: formData.lookingFor ? formData.lookingFor.split(',').map(s => s.trim()).filter(s => s) : [],
        amenities_wanted: formData.amenitiesWanted ? formData.amenitiesWanted.split(',').map(s => s.trim()).filter(s => s) : [],
        deal_breakers: formData.dealBreakers ? formData.dealBreakers.split(',').map(s => s.trim()).filter(s => s) : [],
        is_profile_complete: true,
      };

      const { error } = await updateProfile(user.id, profileUpdates);

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          router.push('/profile');
        }, 1500);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }

    setSaving(false);
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
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground mt-2">
              Update your information to improve your matches
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-800 text-sm p-3 rounded-md mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                currentImageUrl={formData.avatarUrl}
                onImageChange={setAvatarFile}
                onImageUrlChange={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
              />
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input 
                    id="firstName" 
                    name="firstName" 
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input 
                    id="lastName" 
                    name="lastName" 
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input 
                  id="displayName" 
                  name="displayName" 
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="How others will see your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input 
                  type="number" 
                  id="age" 
                  name="age" 
                  min="18" 
                  max="100" 
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Enter your age"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Tell us about yourself, your lifestyle, and what you're looking for in a roommate..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Location & Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Location & Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  name="location" 
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, State"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rentBudgetMin">Min Budget ($/month)</Label>
                  <Input 
                    type="number" 
                    id="rentBudgetMin" 
                    name="rentBudgetMin" 
                    value={formData.rentBudgetMin}
                    onChange={handleInputChange}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentBudgetMax">Max Budget ($/month)</Label>
                  <Input 
                    type="number" 
                    id="rentBudgetMax" 
                    name="rentBudgetMax" 
                    value={formData.rentBudgetMax}
                    onChange={handleInputChange}
                    placeholder="2000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moveInDate">Preferred Move-in Date</Label>
                <Input 
                  type="date" 
                  id="moveInDate" 
                  name="moveInDate" 
                  value={formData.moveInDate}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lifestyle Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Lifestyle Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input 
                    id="smoker" 
                    name="smoker" 
                    type="checkbox" 
                    checked={formData.smoker}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-border" 
                  />
                  <label htmlFor="smoker" className="text-sm">Smoker</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    id="petFriendly" 
                    name="petFriendly" 
                    type="checkbox" 
                    checked={formData.petFriendly}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-border" 
                  />
                  <label htmlFor="petFriendly" className="text-sm">Pet Friendly</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    id="nightOwl" 
                    name="nightOwl" 
                    type="checkbox" 
                    checked={formData.nightOwl}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-border" 
                  />
                  <label htmlFor="nightOwl" className="text-sm">Night Owl</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    id="earlyRiser" 
                    name="earlyRiser" 
                    type="checkbox" 
                    checked={formData.earlyRiser}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-border" 
                  />
                  <label htmlFor="earlyRiser" className="text-sm">Early Riser</label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Roommate Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="lookingFor">Looking For (comma-separated)</Label>
                <Input 
                  id="lookingFor" 
                  name="lookingFor" 
                  value={formData.lookingFor}
                  onChange={handleInputChange}
                  placeholder="e.g. female, male, any, student, professional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenitiesWanted">Desired Amenities (comma-separated)</Label>
                <Input 
                  id="amenitiesWanted" 
                  name="amenitiesWanted" 
                  value={formData.amenitiesWanted}
                  onChange={handleInputChange}
                  placeholder="e.g. gym, pool, parking, laundry"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealBreakers">Deal Breakers (comma-separated)</Label>
                <Input 
                  id="dealBreakers" 
                  name="dealBreakers" 
                  value={formData.dealBreakers}
                  onChange={handleInputChange}
                  placeholder="e.g. smoking, pets, loud music"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Link href="/profile">
              <Button variant="outline" type="button" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}