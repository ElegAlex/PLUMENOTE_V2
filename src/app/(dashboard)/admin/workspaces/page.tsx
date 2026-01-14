/**
 * Admin Workspaces Page
 *
 * Allows admins to create and manage team workspaces.
 *
 * @see Story 8.2: Creation et Gestion des Workspaces (FR37)
 */

import { Metadata } from "next";
import { AdminWorkspacesClient } from "./client";

export const metadata: Metadata = {
  title: "Gestion des Workspaces | PlumeNote Admin",
  description:
    "Creez et gerez des espaces de travail pour organiser la documentation de votre equipe.",
};

/**
 * Admin workspaces management page
 *
 * Server component that renders the client-side workspaces management UI.
 * Admin role verification is handled by the admin layout.
 */
export default function AdminWorkspacesPage() {
  return <AdminWorkspacesClient />;
}
