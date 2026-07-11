import Link from 'next/link';
import { redirect } from 'next/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';

export default async function HomePage() {
  const { user } = await withAuth();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Dropship Admin</h1>
      <p className="text-neutral-500">Sign in to manage your store.</p>
      <Link
        href="/sign-in"
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
      >
        Sign in
      </Link>
    </main>
  );
}
