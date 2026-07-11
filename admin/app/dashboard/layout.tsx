import Link from 'next/link';
import { withAuth, signOut } from '@workos-inc/authkit-nextjs';

const links = [
  { href: '/dashboard/billboards', label: 'Billboards' },
  { href: '/dashboard/categories', label: 'Categories' },
  { href: '/dashboard/sizes', label: 'Sizes' },
  { href: '/dashboard/colors', label: 'Colors' },
  { href: '/dashboard/products', label: 'Products' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold">
              Dropship Admin
            </Link>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-neutral-600 hover:text-black">
                {link.label}
              </Link>
            ))}
          </nav>
          <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <button className="text-sm text-neutral-500 hover:text-black" type="submit">
              {user?.email} · Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
