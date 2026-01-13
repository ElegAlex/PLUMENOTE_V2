"use client";

/**
 * GraphScopeFilter - Folder filter for graph scope
 *
 * Allows users to filter the graph view by folder.
 * Displays a select dropdown with folder list and a badge for active filter.
 *
 * @see Story 6.9: Scope de la Vue Graphe
 * @see AC: #1 - Filtrer par dossier
 * @see AC: #3 - Supprimer le filtre pour revenir à la vue globale
 * @see AC: #5 - Badge indiquant le filtre actif
 */

import { useFolders } from "@/features/notes/hooks/useFolders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Folder } from "lucide-react";

interface GraphScopeFilterProps {
  /** Currently selected folder ID, or null for all notes */
  selectedFolderId: string | null;
  /** Callback when folder selection changes */
  onFolderChange: (folderId: string | null) => void;
}

/**
 * Filter component for scoping graph view by folder
 *
 * @example
 * ```tsx
 * const [folderId, setFolderId] = useState<string | null>(null);
 *
 * <GraphScopeFilter
 *   selectedFolderId={folderId}
 *   onFolderChange={setFolderId}
 * />
 * ```
 */
export function GraphScopeFilter({
  selectedFolderId,
  onFolderChange,
}: GraphScopeFilterProps) {
  const { folders, isLoading } = useFolders();

  // Find selected folder name for badge
  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const handleValueChange = (value: string) => {
    onFolderChange(value === "all" ? null : value);
  };

  const handleClearFilter = () => {
    onFolderChange(null);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedFolderId ?? "all"}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger
          className="w-48"
          aria-label="Filtrer par dossier"
        >
          <Folder className="h-4 w-4 mr-2 flex-shrink-0" />
          <SelectValue placeholder="Filtrer par dossier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les notes</SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {folder.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedFolderId && selectedFolder && (
        <Badge variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
          <span className="truncate max-w-32">{selectedFolder.name}</span>
          <button
            onClick={handleClearFilter}
            className="ml-1 p-0.5 hover:bg-muted rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            aria-label="Supprimer le filtre"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
