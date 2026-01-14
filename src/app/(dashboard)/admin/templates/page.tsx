/**
 * Admin Templates Page
 *
 * Allows admins to create and manage team templates.
 *
 * @see Story 7.3: Gestion des Templates d'Equipe (FR34)
 */

import { Metadata } from "next";
import { AdminTemplatesClient } from "./client";

export const metadata: Metadata = {
  title: "Gestion des Templates | PlumeNote Admin",
  description:
    "Creez et gerez des templates d'equipe pour standardiser la documentation.",
};

/**
 * Admin templates management page
 *
 * Server component that renders the client-side templates management UI.
 * Admin role verification is handled by the admin layout.
 */
export default function AdminTemplatesPage() {
  return <AdminTemplatesClient />;
}
