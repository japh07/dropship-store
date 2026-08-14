import { Urbanist } from 'next/font/google'
import { headers } from 'next/headers'

import ModalProvider from '@/providers/modal-provider'
import ToastProvider from '@/providers/toast-provider'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import AgeGate from '@/components/age-gate'
import { resolveStorefront } from '@/lib/tenant'

import './globals.css'

const font = Urbanist({ subsets: ['latin'] })

export const metadata = {
  title: 'Dropship - High-Quality Products, Great Deals',
  description: 'Discover the best place for all your purchases. Your Dropship Store offers a wide range of high-quality products, including electronics, fashion, home decor, and more. Use Dropship® to design a beautiful website store with ease. Start a dropshipping business with only a few clicks! An easy-to-use online store builder trusted by millions of stores. Jumpstart your dropshipping business with us. Start your free trial today. Drop Shipping Integration. Social Media Integration. Unlimited 24/7 support. Full blogging platform.',
  keywords: 'dropshipping, online store, high-quality products, great deals, electronics, fashion, home decor, Shopify, website builder, dropshipping integration, social media integration, free trial, bangalore, karnataka, tamilnadu, india',
  author: 'drop ship',
  image: 'https://res.cloudinary.com/do7ntibpe/image/upload/v1697378708/dropship-coming-soon.jpg',
  canonical: 'https://dropships.vercel.app',
};



export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Re-resolve the storefront in the layout (Task 9's resolveStorefront already
  // returns the full Storefront shape needed for branding). The middleware has
  // already 404'd unresolvable hosts, so this is normally non-null, but we
  // still fall back gracefully rather than throwing in the layout.
  const host = headers().get('host') || ''
  const storefront = await resolveStorefront(host)

  return (
    <html lang="en">
      <body
        className={font.className}
        style={storefront?.primary_color ? ({ '--primary-color': storefront.primary_color } as React.CSSProperties) : undefined}
      >
        <AgeGate isAgeRestricted={storefront?.is_age_restricted ?? false} />
        <ToastProvider />
        <ModalProvider />
        <Navbar
          storeName={storefront?.store_name}
          logoUrl={storefront?.logo_url}
          primaryColor={storefront?.primary_color}
        />
        {children}
        <Footer />
      </body>
    </html>
  )
}
