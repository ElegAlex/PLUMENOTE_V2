'use server';

/**
 * Server Action for user registration
 *
 * Handles form submission, validation, and user creation.
 * Uses bcrypt for password hashing (cost >= 10 per NFR12).
 */

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { registerSchema, type RegisterFormData } from '../schemas/register.schema';

/**
 * State returned by the register action
 */
export type RegisterState = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof RegisterFormData, string[]>>;
};

/**
 * Register a new user
 *
 * @param prevState - Previous form state (for useActionState)
 * @param formData - Form data from submission
 * @returns Updated state with success/error information
 */
export async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // Extract raw data from form with trimming
  const rawData = {
    name: (formData.get('name') as string)?.trim(),
    email: (formData.get('email') as string)?.trim(),
    password: formData.get('password'),
  };

  // Server-side validation with Zod
  const result = registerSchema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten().fieldErrors as Partial<Record<keyof RegisterFormData, string[]>>,
    };
  }

  const { name, password } = result.data;
  // Normalize email to lowercase for case-insensitive uniqueness
  const email = result.data.email.toLowerCase();

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      success: false,
      error: 'Un compte existe déjà avec cet email',
    };
  }

  // Hash password and create user with error handling
  try {
    const hashedPassword = await hashPassword(password);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'VIEWER',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du compte. Veuillez réessayer.',
    };
  }
}
