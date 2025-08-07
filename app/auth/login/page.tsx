'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { checkProfileComplete } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting to sign in...');
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        setError(error.message);
        return;
      }

      console.log('Sign in successful, checking profile...');
      
      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the current user after login
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        setError('Failed to get user information');
        return;
      }

      if (!currentUser) {
        console.error('No user found after login');
        setError('No user found after login');
        return;
      }

      console.log('User found:', currentUser.id);
      
      // Check profile completion
      const { isComplete, error: profileError } = await checkProfileComplete(currentUser.id);
      
      if (profileError) {
        console.error('Error checking profile:', profileError);
        // If we can't check profile, just go to dashboard
        console.log('Redirecting to dashboard due to profile check error');
        router.push('/dashboard');
        return;
      }

      console.log('Profile complete status:', isComplete);
      
      // Use window.location for more reliable redirect
      console.log('Using window.location for redirect');
      if (isComplete) {
        console.log('Redirecting to dashboard');
        window.location.href = '/dashboard';
      } else {
        console.log('Redirecting to profile setup');
        window.location.href = '/profile/setup';
      }
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to your account
          </p>
        </div>
        
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="name@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter password"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="remember" className="text-muted-foreground">
                Remember me
              </label>
            </div>
            <Link href="#" className="text-muted-foreground hover:text-primary underline underline-offset-4">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}