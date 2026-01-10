/**
 * Header component
 *
 * Main navigation header with user avatar and menu.
 * Displays on all dashboard pages.
 *
 * @see Story 2.5: Page de Profil Utilisateur
 * @see AC #8: Accessible navigation
 */

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, Shield, User } from 'lucide-react';

/**
 * Header component
 *
 * Server component that fetches user data and displays navigation.
 */
export async function Header() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Fetch user with avatar and role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      avatar: true,
      image: true,
      role: true,
    },
  });

  const isAdmin = user?.role === 'ADMIN';

  const avatarUrl = user?.avatar || user?.image;
  const userName = user?.name || user?.email || null;

  return (
    <header className="border-b bg-background" role="banner">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          PlumeNote
        </Link>

        {/* User Menu */}
        <nav aria-label="Menu utilisateur">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full"
                aria-label="Ouvrir le menu utilisateur"
              >
                <UserAvatar
                  src={avatarUrl}
                  name={userName}
                  size="md"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2" role="presentation">
                <UserAvatar
                  src={avatarUrl}
                  name={userName}
                  size="lg"
                />
                <div className="flex flex-col space-y-1">
                  {user?.name && (
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                  )}
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" aria-hidden="true" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  Parametres
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center">
                    <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
                    Administration
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/api/auth/signout" className="flex items-center text-destructive">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Se deconnecter
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
