'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { updateProfile } from "@/lib/profile";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    bio: '',
    location: '',
    smoker: false,
    petFriendly: false,
    nightOwl: false,
    earlyRiser: false,
  });

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

    setLoading(true);
    setError('');

    try {
      const lifestylePreferences = {
        smoker: formData.smoker,
        petFriendly: formData.petFriendly,
        nightOwl: formData.nightOwl,
        earlyRiser: formData.earlyRiser,
      };

      const { error } = await updateProfile(user.id, {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        display_name: formData.firstName,
        age: formData.age ? parseInt(formData.age) : undefined,
        bio: formData.bio,
        location: formData.location,
        lifestyle_preferences: lifestylePreferences,
        is_profile_complete: true,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }

    setLoading(false);
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            Complete your profile
          </h2>
          <p className="text-muted-foreground">
            Tell us about yourself to find the best roommate matches
          </p>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">
              Step 1 of 2: Basic Information
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-foreground h-2 rounded-full w-1/2"></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              min="18"
              max="100"
              placeholder="Enter your age"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tell us about yourself, your lifestyle, and what you're looking for in a roommate..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Current Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter your city, state"
            />
          </div>

          <div className="space-y-3">
            <Label>Lifestyle Preferences</Label>
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
                <label htmlFor="smoker" className="text-sm">
                  Smoker
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="pet-friendly"
                  name="petFriendly"
                  type="checkbox"
                  checked={formData.petFriendly}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="pet-friendly" className="text-sm">
                  Pet Friendly
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="night-owl"
                  name="nightOwl"
                  type="checkbox"
                  checked={formData.nightOwl}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="night-owl" className="text-sm">
                  Night Owl
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="early-riser"
                  name="earlyRiser"
                  type="checkbox"
                  checked={formData.earlyRiser}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="early-riser" className="text-sm">
                  Early Riser
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={handleSkip} disabled={loading}>
              Skip for now
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}