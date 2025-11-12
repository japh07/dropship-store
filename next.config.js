/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Force HTTPS in production
  async headers() {
    const headers = [];

    // Security headers for all routes
    headers.push({
      source: '/(.*)',
      headers: [
        // Content Security Policy
        {
          key: 'Content-Security-Policy',
          value: process.env.NODE_ENV === 'production'
            ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-src 'self' https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`
            : `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-src 'self'; object-src 'none';`,
        },
        // HTTP Strict Transport Security (HSTS)
        {
          key: 'Strict-Transport-Security',
          value: process.env.NODE_ENV === 'production'
            ? 'max-age=31536000; includeSubDomains; preload'
            : 'max-age=0', // Disabled for development
        },
        // X-Frame-Options
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        // X-Content-Type-Options
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        // Referrer Policy
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        // Permissions Policy
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        },
        // X-XSS-Protection
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        // Remove server information
        {
          key: 'Server',
          value: '',
        },
        {
          key: 'X-Powered-By',
          value: '',
        },
      ],
    });

    // Additional headers for API routes
    headers.push({
      source: '/api/(.*)',
      headers: [
        // API rate limiting headers
        {
          key: 'X-RateLimit-Limit',
          value: process.env.RATE_LIMIT_MAX || '100',
        },
        {
          key: 'X-RateLimit-Window',
          value: process.env.RATE_LIMIT_WINDOW || '900000',
        },
        // API-specific headers
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization, X-Request-ID, X-User-ID',
        },
        {
          key: 'Access-Control-Max-Age',
          value: '86400',
        },
        // API security headers
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
      ],
    });

    return headers;
  },

  // Image domains with security considerations
  images: {
    domains: [
      "tailwindui.com",
      "res.cloudinary.com",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
    ],
    // Enable secure image loading
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security: Redirect to HTTPS in production
  async redirects() {
    const redirects = [];

    if (process.env.NODE_ENV === 'production') {
      // Force HTTPS redirects
      redirects.push({
        source: '/:path((?!_next).*)',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        permanent: true,
        destination: 'https://:splat',
      });
    }

    // Security redirects
    redirects.push(
      // Redirect common admin paths to secure login
      {
        source: '/admin/:path*',
        destination: '/auth/signin?callbackUrl=/admin/:path*',
        permanent: false,
      },
      // Redirect wp-admin and other common attack vectors
      {
        source: '/wp-admin/:path*',
        destination: '/auth/signin',
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: '/auth/signin',
        permanent: false,
      }
    );

    return redirects;
  },

  // Security: Webpack configuration for secure builds
  webpack: (config, { dev }) => {
    // Remove source maps from production builds
    if (!dev) {
      config.devtool = false;
    }

    // Security: Additional webpack configurations can be added here
    // Note: source-map-loader would need to be installed separately

    return config;
  },

  // Security: Experimental features
  experimental: {
    // Enable server actions security
    serverComponentsExternalPackages: ['@prisma/client'],
    // Enable SWC minification for better performance and security
    swcMinify: true,
  },

  // Security: Build configuration
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Security: Compression
  compress: true,

  // Security: Power headers
  poweredByHeader: false,

  // Security: Cross-origin isolation
  crossOrigin: 'anonymous',

  // Security: Asset prefix for CDN
  ...(process.env.NODE_ENV === 'production' && {
    assetPrefix: process.env.CDN_URL,
  }),
};

module.exports = nextConfig;
