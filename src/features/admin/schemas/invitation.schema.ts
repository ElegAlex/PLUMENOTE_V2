/**
 * Invitation validation schemas
 *
 * Zod schemas for invitation form validation with French error messages.
 *
 * @see Story 2.6 - Invitation de Nouveaux Utilisateurs (FR5)
 */

import { z } from 'zod';

/**
 * Schema for sending an invitation
 */
export const sendInvitationSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse email est requise')
    .email('L\'adresse email est invalide')
    .max(255, 'L\'adresse email est trop longue'),
});

export type SendInvitationFormData = z.infer<typeof sendInvitationSchema>;
