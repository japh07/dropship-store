import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditLogger } from './lib/audit-logger';

/**
 * Security middleware configuration
 * - Forces HTTPS redirects in production
 * - JWT validation for protected routes
 * - Security headers injection (HSTS, CSP, etc.)
 * - Rate limiting and DDoS protection
 * - Audit logging for all requests
 */

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Limit each IP to 100 requests per window
  successfulRequests: new Map<string, { count: number; resetTime: number }>(),
  blockedIPs: new Set<string>(),
};

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/api/secure',
  '/api/admin',
  '/checkout',
  '/orders',
];

// API routes that require authentication
const protectedAPIRoutes = [
  '/api/secure',
  '/api/admin',
  '/api/user',
  '/api/checkout',
  '/api/orders',
];

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/products',
  '/auth/signin',
  '/auth/error',
  '/api/auth',
  '/api/products',
  '/api/health',
];

/**
 * Check if rate limit is exceeded for an IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - rateLimitConfig.windowMs;

  // Clean up expired entries
  for (const [key, value] of Array.from(rateLimitConfig.successfulRequests.entries())) {
    if (now > value.resetTime) {
      rateLimitConfig.successfulRequests.delete(key);
    }
  }

  // Check if IP is blocked
  if (rateLimitConfig.blockedIPs.has(ip)) {
    return { allowed: false, remaining: 0, resetTime: now + rateLimitConfig.windowMs };
  }

  const current = rateLimitConfig.successfulRequests.get(ip);

  if (!current || now > current.resetTime) {
    // First request or window expired
    rateLimitConfig.successfulRequests.set(ip, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs,
    });
    return { allowed: true, remaining: rateLimitConfig.maxRequests - 1, resetTime: now + rateLimitConfig.windowMs };
  }

  if (current.count >= rateLimitConfig.maxRequests) {
    // Block this IP temporarily
    rateLimitConfig.blockedIPs.add(ip);
    setTimeout(() => rateLimitConfig.blockedIPs.delete(ip), rateLimitConfig.windowMs);

    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  // Increment counter
  current.count++;
  return {
    allowed: true,
    remaining: rateLimitConfig.maxRequests - current.count,
    resetTime: current.resetTime
  };
}

/**
 * Generate Content Security Policy header
 */
function generateCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://res.cloudinary.com",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];

  return directives.join('; ');
}

/**
 * Generate security headers
 */
function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    // Content Security Policy
    'Content-Security-Policy': generateCSP(),

    // HTTP Strict Transport Security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // X-Frame-Options
    'X-Frame-Options': 'DENY',

    // X-Content-Type-Options
    'X-Content-Type-Options': 'nosniff',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

    // X-XSS-Protection
    'X-XSS-Protection': '1; mode=block',

    // Remove server information
    'Server': '',
    'X-Powered-By': '',
  };

  // Add CORS headers if configured
  if (process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    headers['Access-Control-Allow-Origin'] = allowedOrigins.join(',');
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

/**
 * Check if path requires authentication
 */
function requiresAuthentication(path: string): boolean {
  // Check protected routes
  if (protectedRoutes.some(route => path.startsWith(route))) {
    return true;
  }

  // Check protected API routes
  if (protectedAPIRoutes.some(route => path.startsWith(route))) {
    return true;
  }

  return false;
}

/**
 * Check if path is public
 */
function isPublicPath(path: string): boolean {
  return publicRoutes.some(route => path.startsWith(route));
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  // Generate request ID for tracking
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Add request ID to headers for downstream use
  request.headers.set('x-request-id', requestId);

  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      await auditLogger.logSecurityEvent('rate_limit_exceeded', {
        ip,
        path: pathname,
        userAgent: request.headers.get('user-agent'),
        requestId,
      }, request, 'ERROR');

      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '900',
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      });
    }

    // HTTPS enforcement in production
    if (process.env.NODE_ENV === 'production' && request.headers.get('x-forwarded-proto') !== 'https') {
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = 'https';

      await auditLogger.logSecurityEvent('https_redirect', {
        ip,
        originalProtocol: request.headers.get('x-forwarded-proto'),
        targetUrl: httpsUrl.toString(),
        requestId,
      }, request);

      return NextResponse.redirect(httpsUrl, 301);
    }

    // Authentication check for protected routes
    if (requiresAuthentication(pathname)) {
      try {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          secureCookie: process.env.NODE_ENV === 'production',
        });

        if (!token) {
          await auditLogger.logSecurityEvent('unauthorized_access_attempt', {
            ip,
            path: pathname,
            userAgent: request.headers.get('user-agent'),
            requestId,
          }, request);

          // Redirect to login for web routes
          if (!pathname.startsWith('/api/')) {
            const loginUrl = new URL('/auth/signin', request.url);
            loginUrl.searchParams.set('callbackUrl', request.url);
            return NextResponse.redirect(loginUrl);
          }

          // Return 401 for API routes
          return new NextResponse('Unauthorized', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer',
            },
          });
        }

        // Validate token expiration
        if (token.exp && Date.now() >= token.exp * 1000) {
          await auditLogger.logAuthEvent('token_expired_access', {
            userId: token.sub,
            ip,
            path: pathname,
            requestId,
          });

          return new NextResponse('Token Expired', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer error="invalid_token" error_description="The access token expired"',
            },
          });
        }

        // Add user info to request headers for downstream use
        request.headers.set('x-user-id', token.sub || '');
        request.headers.set('x-user-email', token.email || '');

      } catch (error) {
        console.error('Authentication error:', error);

        await auditLogger.logSecurityEvent('authentication_error', {
          ip,
          path: pathname,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId,
        }, request, 'ERROR');

        return new NextResponse('Authentication Error', { status: 500 });
      }
    }

    // Create response
    const response = NextResponse.next();

    // Add security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add rate limiting headers
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    // Add custom headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    // Log successful request
    await auditLogger.logAPICall(
      request.method || 'GET',
      pathname,
      200, // Will be updated after response
      Date.now() - startTime,
      {
        ip,
        userAgent: request.headers.get('user-agent'),
        requestId,
        contentType: request.headers.get('content-type'),
        contentLength: request.headers.get('content-length'),
      },
      request
    );

    return response;

  } catch (error) {
    console.error('Middleware error:', error);

    // Log error
    await auditLogger.logSecurityEvent('middleware_error', {
      ip,
      path: pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    }, request, 'ERROR');

    // Return error response
    const response = new NextResponse('Internal Server Error', { status: 500 });

    // Still add security headers to error response
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', requestId);

    return response;
  }
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

export default middleware;