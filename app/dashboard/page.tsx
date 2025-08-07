import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Find roommates
          </h1>
          <p className="text-muted-foreground">
            Discover compatible roommates in your area
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-end gap-4" suppressHydrationWarning={true}>
              <div className="flex-1 min-w-64 space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Enter city or zip code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Radius</Label>
                <select
                  id="radius"
                  className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>5 miles</option>
                  <option>10 miles</option>
                  <option>25 miles</option>
                  <option>50 miles</option>
                </select>
              </div>
              <Button>Search</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Alex Johnson</h3>
                    <p className="text-sm text-muted-foreground">25 • 2.3 miles away</p>
                  </div>
                  <span className="text-sm font-medium">$1,200/mo</span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Graduate student looking for a clean, quiet roommate. Love cooking and outdoor activities.
                </p>
                
                <div className="flex gap-2 mb-4">
                  <span className="px-2 py-1 bg-secondary text-xs rounded-full">
                    Pet Friendly
                  </span>
                  <span className="px-2 py-1 bg-secondary text-xs rounded-full">
                    Early Riser
                  </span>
                </div>
                
                <Button className="w-full" size="sm">
                  Connect
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline">Load more</Button>
        </div>
      </div>
    </div>
  );
}