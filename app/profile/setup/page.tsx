import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfileSetupPage() {
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

        <form className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                name="first-name"
                placeholder="Enter your first name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                name="last-name"
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
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="smoker" className="text-sm">
                  Smoker
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="pet-friendly"
                  name="pet-friendly"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="pet-friendly" className="text-sm">
                  Pet Friendly
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="night-owl"
                  name="night-owl"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="night-owl" className="text-sm">
                  Night Owl
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="early-riser"
                  name="early-riser"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="early-riser" className="text-sm">
                  Early Riser
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <Button type="button" variant="outline">
              Skip for now
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}