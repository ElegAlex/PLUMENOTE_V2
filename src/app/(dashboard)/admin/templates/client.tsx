"use client";

/**
 * Admin Templates Client Component
 *
 * Client-side component for templates management.
 * Handles state for dialogs and integrates with templates feature.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe (FR34)
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TemplateList } from "@/features/templates/components/TemplateList";
import { TemplateDialog } from "@/features/templates/components/TemplateDialog";
import type { Template } from "@/features/templates/types";

/**
 * Client-side admin templates management UI
 *
 * Provides:
 * - Template list with edit/delete actions
 * - Create new template button
 * - Edit template dialog
 */
export function AdminTemplatesClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Template | undefined
  >(undefined);

  const handleCreateClick = () => {
    setSelectedTemplate(undefined);
    setDialogOpen(true);
  };

  const handleEditClick = (template: Template) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Clear selection when dialog closes
      setSelectedTemplate(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Templates</CardTitle>
            <CardDescription className="mt-1.5">
              Creez et gerez des templates pour standardiser la documentation de
              votre equipe.
            </CardDescription>
          </div>
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau template
          </Button>
        </CardHeader>
        <CardContent>
          <TemplateList onEdit={handleEditClick} />
        </CardContent>
      </Card>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        template={selectedTemplate}
      />
    </div>
  );
}
