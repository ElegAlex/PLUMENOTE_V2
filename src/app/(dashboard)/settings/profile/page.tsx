/**
 * Profile Settings Page
 *
 * Page for users to view and edit their profile information.
 * Displays the ProfileForm component with user data from the session.
 *
 * @see Story 2.5: Page de Profil Utilisateur (FR4)
 * @see AC #1: Modify name with toast confirmation
 * @see AC #2: Upload avatar (JPG/PNG, max 2MB)
 * @see AC #7: Redirect to login if not authenticated
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/features/auth/components/ProfileForm';

export const metadata = {
  title: 'Profil | PlumeNote',
  description: 'Gerez votre profil et vos informations personnelles.',
};

/**
 * Skeleton loader for ProfileForm
 * Displays while the profile data is loading
 */
function ProfileFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar Card Skeleton */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-9 w-32 animate-pulse rounded bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info Card Skeleton */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile content component that fetches user data
 */
async function ProfileContent() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch complete user data from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      image: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  return <ProfileForm user={user} />;
}

export default function ProfilePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-muted-foreground">
          Gerez vos informations personnelles et votre avatar.
        </p>
      </div>

      <Suspense fallback={<ProfileFormSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
