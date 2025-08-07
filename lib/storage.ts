import { supabase } from './supabase'

const BUCKET_NAME = 'profile-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface UploadResult {
  url: string | null
  error: string | null
}

// Resize and compress image before upload
function resizeImage(file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxWidth) {
          width = (width * maxWidth) / height
          height = maxWidth
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          } else {
            resolve(file)
          }
        },
        file.type,
        quality
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

export async function uploadProfileImage(userId: string, file: File): Promise<UploadResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        url: null,
        error: 'Please upload a valid image file (JPEG, PNG, or WebP)'
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        url: null,
        error: 'Image size must be less than 5MB'
      }
    }

    // Resize and compress the image
    const optimizedFile = await resizeImage(file)

    // Generate unique filename - use userId as folder name for RLS policies
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    // Delete existing profile image if any
    await deleteExistingProfileImage(userId)

    // Upload to Supabase Storage
    console.log('Uploading to path:', filePath)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, optimizedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return {
        url: null,
        error: error.message
      }
    }

    console.log('Upload successful, data:', data)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    console.log('Generated public URL:', urlData.publicUrl)

    return {
      url: urlData.publicUrl,
      error: null
    }
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Failed to upload image'
    }
  }
}

async function deleteExistingProfileImage(userId: string) {
  try {
    // List files in the user's folder
    const { data: files } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId)

    if (files && files.length > 0) {
      // Delete all existing files for this user
      const filesToDelete = files.map(file => `${userId}/${file.name}`)
      await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete)
    }
  } catch (error) {
    console.warn('Failed to delete existing profile image:', error)
  }
}

export async function deleteProfileImage(imageUrl: string): Promise<{ error: string | null }> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/')
    const bucketIndex = urlParts.findIndex(part => part === BUCKET_NAME)
    
    if (bucketIndex === -1) {
      return { error: 'Invalid image URL' }
    }

    const filePath = urlParts.slice(bucketIndex + 1).join('/')

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete image'
    }
  }
}