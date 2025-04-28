import LoginForm from '@/components/admin/LoginForm'; // Adjust path if needed

// Revert to a simple Server Component that just renders the form.
// Authentication and redirection are handled by middleware.ts
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
