"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Profile, sendConnectionRequest } from "@/lib/profile"

interface ConnectionRequestModalProps {
  profile: Profile | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ConnectionRequestModal({ 
  profile, 
  isOpen, 
  onClose, 
  onSuccess 
}: ConnectionRequestModalProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!profile || !message.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await sendConnectionRequest(profile.id, message.trim())
      
      if (error) {
        setError(error.message || 'Failed to send connection request')
      } else {
        onSuccess()
        handleClose()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setMessage("")
    setError(null)
    onClose()
  }

  if (!profile) return null

  const displayName = profile.display_name || profile.full_name || 'this person'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Connection Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={displayName} 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <span className="text-lg font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-medium">{displayName}</h3>
              {profile.location && (
                <p className="text-sm text-muted-foreground">📍 {profile.location}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="message" className="text-sm font-medium mb-2 block">
              Introduce yourself and explain why you'd be great roommates:
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I saw your profile and think we'd be compatible roommates because..."
              rows={4}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}