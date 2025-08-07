'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { uploadProfileImage, UploadResult } from '@/lib/storage'
import { Camera, X, Upload } from 'lucide-react'
import { updateProfile } from '@/lib/profile'

interface ImageUploadProps {
  userId: string
  currentImageUrl?: string
  onImageUpdate?: (url: string | null) => void
  className?: string
}

export function ImageUpload({ userId, currentImageUrl, onImageUpdate, className }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      console.log('Starting upload for user:', userId)
      const result: UploadResult = await uploadProfileImage(userId, file)
      
      console.log('Upload result:', result)
      
      if (result.error) {
        console.error('Upload error:', result.error)
        setError(result.error)
      } else if (result.url) {
        console.log('Upload successful, URL:', result.url)
        setImageUrl(result.url)
        
        // Update the profile with the new image URL
        const updateResult = await updateProfile(userId, { avatar_url: result.url })
        console.log('Profile update result:', updateResult)
        
        onImageUpdate?.(result.url)
      }
    } catch (err) {
      console.error('Upload exception:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    setImageUrl(null)
    
    // Update the profile to remove the image URL
    await updateProfile(userId, { avatar_url: null })
    
    onImageUpdate?.(null)
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          {imageUrl ? (
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-2 border-border">
                <img
                  src={imageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  onError={(e) => {
                    console.error('Image failed to load:', imageUrl, e)
                    setError('Failed to load image. Please try uploading again.')
                  }}
                />
              </div>
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div 
              className="w-32 h-32 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={triggerFileSelect}
            >
              <div className="text-center">
                <Camera size={32} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Add Photo</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileSelect}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} className="mr-2" />
                {imageUrl ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center max-w-xs">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Upload a profile photo (max 5MB). JPEG, PNG, or WebP formats supported.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}