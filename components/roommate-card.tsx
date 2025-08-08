import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Profile } from "@/lib/profile"
import { MessageCircle, User, CheckCircle, Clock, UserPlus } from "lucide-react"

interface RoommateCardProps {
  profile: Profile & { distance?: number }
  onConnect?: (profileId: string) => void
  onMessage?: (profileId: string) => void
  onViewProfile?: (profileId: string) => void
  onAcceptRequest?: (profileId: string, requestId: string) => void
  onDeclineRequest?: (profileId: string, requestId: string) => void
  connectionStatus?: {
    status: 'none' | 'pending_sent' | 'pending_received' | 'connected'
    requestId?: string
  }
  isConnecting?: boolean
  isRespondingToRequest?: boolean
}

export function RoommateCard({ 
  profile, 
  onConnect, 
  onMessage, 
  onViewProfile,
  onAcceptRequest,
  onDeclineRequest,
  connectionStatus = { status: 'none' }, 
  isConnecting = false,
  isRespondingToRequest = false
}: RoommateCardProps) {
  const formatDistance = (distance?: number) => {
    if (!distance) return ""
    return distance < 1 ? "< 1 mile away" : `${Math.round(distance * 10) / 10} miles away`
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "Budget not specified"
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}/mo`
    if (min) return `$${min.toLocaleString()}+/mo`
    if (max) return `Up to $${max.toLocaleString()}/mo`
  }

  const getDisplayName = () => {
    return profile.display_name || profile.full_name || "Anonymous User"
  }

  const formatAge = () => {
    return profile.age ? `${profile.age}` : ""
  }

  const getLifestyleTags = () => {
    const tags: string[] = []
    
    if (profile.lifestyle_preferences) {
      const prefs = profile.lifestyle_preferences
      if (prefs.pet_friendly) tags.push("Pet Friendly")
      if (prefs.early_riser) tags.push("Early Riser")
      if (prefs.night_owl) tags.push("Night Owl")
      if (prefs.social) tags.push("Social")
      if (prefs.quiet) tags.push("Quiet")
      if (prefs.clean) tags.push("Clean")
      if (prefs.smoker) tags.push("Smoker")
      if (prefs.non_smoker) tags.push("Non-Smoker")
    }
    
    return tags.slice(0, 3)
  }

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">{getDisplayName()}</h3>
            <p className="text-sm text-muted-foreground">
              {[formatAge(), formatDistance(profile.distance)]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>
          <span className="text-sm font-medium">
            {formatBudget(profile.rent_budget_min, profile.rent_budget_max)}
          </span>
        </div>
        
        {profile.bio && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {profile.bio}
          </p>
        )}
        
        {getLifestyleTags().length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {getLifestyleTags().map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-secondary text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {profile.location && (
          <p className="text-xs text-muted-foreground mb-4">
            📍 {profile.location}
          </p>
        )}
        
        {connectionStatus.status === 'connected' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Connected</span>
            </div>
            <div className="flex gap-2">
              {onMessage && (
                <Button 
                  className="flex-1" 
                  size="sm"
                  onClick={() => onMessage(profile.id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              )}
              {onViewProfile && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewProfile(profile.id)}
                >
                  <User className="h-4 w-4 mr-1" />
                  Profile
                </Button>
              )}
            </div>
          </div>
        )}

        {connectionStatus.status === 'pending_sent' && (
          <div className="text-center">
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-md mb-2">
              <Clock className="h-4 w-4" />
              <span>Connection request sent</span>
            </div>
            {onViewProfile && (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => onViewProfile(profile.id)}
              >
                <User className="h-4 w-4 mr-1" />
                View Profile
              </Button>
            )}
          </div>
        )}

        {connectionStatus.status === 'pending_received' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
              <UserPlus className="h-4 w-4" />
              <span className="font-medium">Wants to connect with you</span>
            </div>
            <div className="flex gap-2">
              {onAcceptRequest && connectionStatus.requestId && (
                <Button 
                  size="sm"
                  className="flex-1"
                  onClick={() => onAcceptRequest(profile.id, connectionStatus.requestId!)}
                  disabled={isRespondingToRequest}
                >
                  {isRespondingToRequest ? "..." : "Accept"}
                </Button>
              )}
              {onDeclineRequest && connectionStatus.requestId && (
                <Button 
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onDeclineRequest(profile.id, connectionStatus.requestId!)}
                  disabled={isRespondingToRequest}
                >
                  {isRespondingToRequest ? "..." : "Decline"}
                </Button>
              )}
            </div>
            {onViewProfile && (
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full"
                onClick={() => onViewProfile(profile.id)}
              >
                <User className="h-4 w-4 mr-1" />
                View Profile
              </Button>
            )}
          </div>
        )}

        {connectionStatus.status === 'none' && onConnect && (
          <Button 
            className="w-full" 
            size="sm"
            onClick={() => onConnect(profile.id)}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}