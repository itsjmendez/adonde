import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Profile } from "@/lib/profile"

interface RoommateCardProps {
  profile: Profile & { distance?: number }
  onConnect?: (profileId: string) => void
  isConnecting?: boolean
}

export function RoommateCard({ profile, onConnect, isConnecting = false }: RoommateCardProps) {
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
        
        {onConnect && (
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