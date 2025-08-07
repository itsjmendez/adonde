import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-6xl font-bold tracking-tight text-foreground mb-6">
            Find your perfect roommate
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Connect with compatible roommates in your area
          </p>
          
          <div className="flex gap-3 justify-center mb-20">
            <Button asChild size="lg">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="space-y-2">
              <h3 className="font-medium">Location-Based</h3>
              <p className="text-sm text-muted-foreground">Find roommates in your preferred area with customizable search radius</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Verified Profiles</h3>
              <p className="text-sm text-muted-foreground">All users go through email verification for a safer community</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Secure Messaging</h3>
              <p className="text-sm text-muted-foreground">Connect and chat with potential roommates through our platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
