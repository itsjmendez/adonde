import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfileEditPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight mb-2">
            Edit Profile
          </h2>
          <p className="text-muted-foreground">
            Update your information to improve your matches
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" name="first-name" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" name="last-name" defaultValue="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input type="number" id="age" name="age" min="18" max="100" defaultValue="25" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  defaultValue="I'm a friendly and organized person looking for a compatible roommate. I work in tech and enjoy cooking, reading, and occasional weekend trips."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Preferred Location</Label>
                <Input id="location" name="location" defaultValue="San Francisco, CA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range (per month)</Label>
                <select
                  id="budget"
                  name="budget"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option>$500 - $1,000</option>
                  <option>$1,000 - $1,500</option>
                  <option>$1,500 - $2,000</option>
                  <option>$2,000 - $2,500</option>
                  <option>$2,500+</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label>Lifestyle</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input id="smoker" name="smoker" type="checkbox" className="h-4 w-4 rounded border-border" />
                    <label htmlFor="smoker" className="text-sm">Smoker</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="pet-friendly" name="pet-friendly" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                    <label htmlFor="pet-friendly" className="text-sm">Pet Friendly</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="night-owl" name="night-owl" type="checkbox" className="h-4 w-4 rounded border-border" />
                    <label htmlFor="night-owl" className="text-sm">Night Owl</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="early-riser" name="early-riser" type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                    <label htmlFor="early-riser" className="text-sm">Early Riser</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}