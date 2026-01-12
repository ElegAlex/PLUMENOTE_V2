"use client";

/**
 * Homepage
 *
 * Landing page for authenticated users with quick access to important notes.
 * Displays personalized greeting, search bar, and sections for recent and favorite notes.
 *
 * @see Story 5.6: Homepage Dynamique (FR32)
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, FileText, Star, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentNotes, FavoriteNotes, useNotes } from "@/features/notes";
import { SearchBar } from "@/features/search";

/**
 * Format current date in French
 */
function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Quick stats card component
 */
function QuickStats() {
  const { meta: recentMeta, isLoading: recentLoading } = useNotes({
    pageSize: 1,
  });
  const { meta: favoritesMeta, isLoading: favoritesLoading } = useNotes({
    favoriteOnly: true,
    pageSize: 1,
  });

  const isLoading = recentLoading || favoritesLoading;
  const totalNotes = recentMeta?.total ?? 0;
  const totalFavorites = favoritesMeta?.total ?? 0;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      icon: FileText,
      label: "Total notes",
      value: totalNotes,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Star,
      label: "Favoris",
      value: totalFavorites,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      icon: Calendar,
      label: "Cette semaine",
      value: "-",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Homepage component
 */
export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { createNoteAsync, isCreating } = useNotes({ enabled: false });

  const userName = session?.user?.name || "Alex";
  const formattedDate = capitalize(formatCurrentDate());

  // Create a new note and navigate to it
  const handleCreateNote = useCallback(async () => {
    try {
      const note = await createNoteAsync({});
      toast.success("Note créée");
      router.push(`/notes/${note.id}`);
    } catch {
      toast.error("Échec de la création", {
        description: "Impossible de créer la note.",
      });
    }
  }, [createNoteAsync, router]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Hero Section: Welcome + Search + Create */}
      <section aria-label="Bienvenue" className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bonjour {userName}
            </h1>
            <p className="mt-1 text-muted-foreground">{formattedDate}</p>
          </div>
          <Button
            onClick={handleCreateNote}
            disabled={isCreating}
            size="lg"
            className="shrink-0"
          >
            <Plus className="mr-2 h-5 w-5" />
            {isCreating ? "Création..." : "Nouvelle note"}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mt-6 max-w-2xl">
          <SearchBar />
        </div>
      </section>

      {/* Quick Stats */}
      <section aria-label="Statistiques" className="mb-8">
        <QuickStats />
      </section>

      {/* Notes Sections: Favorites + Recent */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Notes favorites">
          <FavoriteNotes limit={5} />
        </section>
        <section aria-label="Notes récentes">
          <RecentNotes limit={5} />
        </section>
      </div>
    </div>
  );
}
