import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ConnectionsPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Connections
          </h1>
          <p className="text-muted-foreground">
            Manage your connection requests and active chats
          </p>
        </div>

        <div className="mb-8 border-b">
          <nav className="-mb-px flex space-x-6">
            <button className="border-b-2 border-foreground py-2 text-sm font-medium">
              Pending (3)
            </button>
            <button className="text-muted-foreground hover:text-foreground py-2 text-sm font-medium">
              Active (2)
            </button>
            <button className="text-muted-foreground hover:text-foreground py-2 text-sm font-medium">
              Sent (1)
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium">Sarah Chen</h3>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Accept</Button>
                  <Button size="sm" variant="outline">Decline</Button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm">
                  "Hi! I saw your profile and think we'd be great roommates. I'm also looking for a place in downtown and have similar lifestyle preferences. Would love to chat!"
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium">Mike Rodriguez</h3>
                  <p className="text-sm text-muted-foreground">1 day ago</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Accept</Button>
                  <Button size="sm" variant="outline">Decline</Button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm">
                  "Hey there! I'm a software engineer looking for a roommate. Your profile caught my attention - we seem to have similar interests and schedules!"
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium">Emma Wilson</h3>
                  <p className="text-sm text-muted-foreground">3 days ago</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Accept</Button>
                  <Button size="sm" variant="outline">Decline</Button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm">
                  "Hi! I'm a graduate student looking for a quiet, studious roommate. I noticed we both prefer early morning routines. Let's connect!"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            No more pending requests
          </p>
        </div>
      </div>
    </div>
  );
}