/**
 * Settings Layout
 *
 * Layout for all settings pages with a sidebar navigation.
 * Provides consistent navigation for profile, account, and other settings.
 *
 * @see Story 2.5: Page de Profil Utilisateur
 * @see AC #7: Protected route - redirect to login if not authenticated
 * @see AC #8: WCAG 2.1 AA accessibility
 */

import Link from 'next/link';
import { User, Settings } from 'lucide-react';

interface SettingsNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    href: '/settings/profile',
    label: 'Profil',
    icon: <User className="h-4 w-4" aria-hidden="true" />,
  },
  // Future settings pages can be added here
  // {
  //   href: '/settings/account',
  //   label: 'Compte',
  //   icon: <Settings className="h-4 w-4" aria-hidden="true" />,
  // },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0" role="complementary">
          <nav aria-label="Parametres" className="space-y-1">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" aria-hidden="true" />
              Parametres
            </h2>
            {settingsNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
