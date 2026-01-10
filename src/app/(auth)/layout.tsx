/**
 * Auth Layout
 *
 * Centered, minimal layout for authentication pages.
 * Used by /login, /register, /forgot-password routes.
 * Note: Toaster is provided by root layout, no need to duplicate here.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
