import LoginForm from '@/components/admin/LoginForm'; // Adjust path if needed

// This is now a Server Component by default
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
