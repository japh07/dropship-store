import type { Metadata } from 'next';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { Toaster } from '@/components/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dropship Admin',
  description: 'CMS and admin dashboard for the dropship storefront',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { accessToken } = await withAuth();

  return (
    <html lang="en">
      <body>
        <ConvexClientProvider expectAuth={!!accessToken}>
          <Toaster />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
