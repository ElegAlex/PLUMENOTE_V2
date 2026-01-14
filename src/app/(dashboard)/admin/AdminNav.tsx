"use client";

/**
 * Admin Navigation Component
 *
 * Navigation tabs for admin section.
 *
 * @see Story 7.3 - Gestion des Templates d'Equipe
 * @see Story 8.2 - Creation et Gestion des Workspaces
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/admin/users",
    label: "Utilisateurs",
    icon: Users,
  },
  {
    href: "/admin/templates",
    label: "Templates",
    icon: FileText,
  },
  {
    href: "/admin/workspaces",
    label: "Workspaces",
    icon: FolderKanban,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 border-b" aria-label="Navigation admin">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
