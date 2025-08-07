interface UserAvatarProps {
  imageUrl?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function UserAvatar({ imageUrl, name, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm', 
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg'
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  if (imageUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden bg-muted border border-border flex-shrink-0`}>
        <img
          src={imageUrl}
          alt={name || 'Profile'}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} ${className} rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-medium flex-shrink-0`}>
      {getInitials(name)}
    </div>
  )
}