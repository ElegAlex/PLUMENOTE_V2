/**
 * UserAvatar component
 *
 * Displays user avatar image or fallback with initials.
 * Supports multiple sizes and is fully accessible.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #8: Accessible form with labels, focus visible, ARIA
 */

import Image from 'next/image';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  /** Avatar image URL */
  src?: string | null;
  /** User's name for alt text and fallback initial */
  name?: string | null;
  /** Avatar size */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-16 w-16 text-xl',
};

const imageSizes: Record<AvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 64,
};

/**
 * UserAvatar component
 *
 * Displays user avatar with fallback to initials.
 */
export function UserAvatar({
  src,
  name,
  size = 'md',
  className,
}: UserAvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const altText = name || 'Avatar';
  const sizeClass = sizeClasses[size];
  const imageSize = imageSizes[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={altText}
        width={imageSize}
        height={imageSize}
        className={cn(
          'rounded-full object-cover',
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={altText}
      className={cn(
        'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
        sizeClass,
        className
      )}
    >
      {initial}
    </div>
  );
}
