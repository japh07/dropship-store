import { Urbanist } from 'next/font/google'

import ModalProvider from '@/providers/modal-provider'
import ToastProvider from '@/providers/toast-provider'
import SessionProviderWrapper from '@/providers/session-provider'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

import './globals.css'

const font = Urbanist({ subsets: ['latin'] })

export const metadata = {
  title: 'Dropship - High-Quality Products, Great Deals',
  description: 'Discover the best place for all your purchases. Your Dropship Store offers a wide range of high-quality products, including electronics, fashion, home decor, and more. Use Dropship® to design a beautiful website store with ease. Start a dropshipping business with only a few clicks! An easy-to-use online store builder trusted by millions of stores. Jumpstart your dropshipping business with us. Start your free trial today. Drop Shipping Integration. Social Media Integration. Unlimited 24/7 support. Full blogging platform.',
  keywords: 'dropshipping, online store, high-quality products, great deals, electronics, fashion, home decor, Shopify, website builder, dropshipping integration, social media integration, free trial, bangalore, karnataka, tamilnadu, india',
  author: 'drop ship',
  image: 'https://res.cloudinary.com/do7ntibpe/image/upload/v1697378708/dropship-coming-soon.jpg',
  canonical: 'https://dropships.vercel.app',

  // Security-related metadata
  robots: 'index, follow',
  googlebot: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',

  // Open Graph security
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dropships.vercel.app',
    siteName: 'Dropship Store',
    images: [
      {
        url: 'https://res.cloudinary.com/do7ntibpe/image/upload/v1697378708/dropship-coming-soon.jpg',
        width: 1200,
        height: 630,
        alt: 'Dropship Store - High-Quality Products',
      },
    ],
  },

  // Twitter Card security
  twitter: {
    card: 'summary_large_image',
    site: '@dropship',
    creator: '@dropship',
    images: ['https://res.cloudinary.com/do7ntibpe/image/upload/v1697378708/dropship-coming-soon.jpg'],
  },

  // Additional security headers
  other: {
    // X-Content-Type-Options
    'x-content-type-options': 'nosniff',

    // X-Frame-Options
    'x-frame-options': 'DENY',

    // Referrer Policy
    'referrer-policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',

    // Content Security Policy report-only (for monitoring)
    'content-security-policy-report-only': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:;",
  },
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for security and performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />

        {/* DNS prefetch for security */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//res.cloudinary.com" />

        {/* Security meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#ffffff" />

        {/* CSRF protection */}
        <meta name="csrf-token" content={typeof window !== 'undefined' ?
          (document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '') :
          ''} />
      </head>
      <body className={font.className}>
        <SessionProviderWrapper>
          <ToastProvider />
          <ModalProvider />
          <Navbar />
          {children}
          <Footer />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
