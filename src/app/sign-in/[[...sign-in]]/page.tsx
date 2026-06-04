import { SignIn } from "@clerk/nextjs";

/**
 * Authentication page powered by Clerk.
 * Provides user sign-in and account access.
 */
export default function Page() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
  );
}
