"use client";

/**
 * SearchBar Component
 *
 * A prominent search input for the homepage.
 * Clicking or focusing navigates to the dashboard with search active.
 *
 * @see Story 5.6: Homepage Dynamique (AC: #4)
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Prominent search bar that redirects to dashboard with search query
 */
export function SearchBar({
  placeholder = "Rechercher une note... (Ctrl+K)",
  className,
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        router.push(`/dashboard?search=${encodeURIComponent(value.trim())}`);
      } else {
        router.push("/dashboard");
      }
    },
    [router, value]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Navigate to dashboard on Enter for search experience
      if (e.key === "Enter" && !value.trim()) {
        e.preventDefault();
        router.push("/dashboard");
      }
    },
    [router, value]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-12 h-11 text-base"
        aria-label="Rechercher une note"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>
    </form>
  );
}
