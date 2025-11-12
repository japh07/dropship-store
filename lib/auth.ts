import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EnvEncryption } from './encryption';
import { auditLogger } from './audit-logger';

/**
 * Authentication types and interfaces
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  provider?: string;
}

export interface AuthSession {
  user: AuthUser | null;
  expires: string;
  provider?: string;
  accessToken?: string;
  error?: string;
}

export interface JWTPayload {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  iat?: number;
  exp?: number;
  jti?: string;
  encryptedData?: any;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  provider?: string;
  error?: string;
}

/**
 * Authentication utilities and helper functions
 */

/**
 * Get current server session with enhanced security checks
 * @param req - Next.js request object (optional)
 * @returns Auth session or null if not authenticated
 */
export async function getAuthSession(req?: NextRequest): Promise<AuthSession | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return null;
    }

    // Validate session structure
    if (!session.user || !session.user.email) {
      await auditLogger.logSecurityEvent('invalid_session_structure', {
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    // Log session access
    await auditLogger.logAuthEvent('session_access', {
      userId: session.user.id,
      email: session.user.email,
      timestamp: new Date().toISOString(),
    });

    return session as AuthSession;
  } catch (error) {
    console.error('Error getting auth session:', error);
    await auditLogger.logSecurityEvent('session_access_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Get JWT token from request with validation
 * @param req - Next.js request object
 * @returns JWT payload or null if invalid
 */
export async function getJWTToken(req: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });

    if (!token) {
      return null;
    }

    // Validate token structure
    if (!token.sub || !token.email) {
      await auditLogger.logSecurityEvent('invalid_token_structure', {
        tokenPayload: JSON.stringify(token),
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    // Check token expiration
    if (token.exp && typeof token.exp === 'number' && Date.now() >= token.exp * 1000) {
      await auditLogger.logAuthEvent('token_expired_access', {
        userId: token.sub,
        email: token.email,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    return token as JWTPayload;
  } catch (error) {
    console.error('Error getting JWT token:', error);
    await auditLogger.logSecurityEvent('token_access_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Verify if user is authenticated
 * @param req - Next.js request object (optional)
 * @returns True if user is authenticated
 */
export async function isAuthenticated(req?: NextRequest): Promise<boolean> {
  try {
    if (req) {
      const token = await getJWTToken(req);
      return token !== null;
    } else {
      const session = await getAuthSession();
      return session !== null && session.user !== null;
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get current user with enhanced security
 * @param req - Next.js request object (optional)
 * @returns Auth user or null if not authenticated
 */
export async function getCurrentUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    if (req) {
      const token = await getJWTToken(req);
      if (!token || !token.sub || !token.email) {
        return null;
      }

      return {
        id: token.sub,
        email: token.email,
        name: token.name || '',
        image: token.picture,
        provider: token.provider,
      };
    } else {
      const session = await getAuthSession();
      return session?.user || null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Encrypt sensitive user data for storage
 * @param data - User data to encrypt
 * @returns Encrypted data
 */
export function encryptUserData(data: Partial<AuthUser>): string {
  try {
    const encrypted = EnvEncryption.encrypt(data);
    return JSON.stringify(encrypted);
  } catch (error) {
    console.error('Error encrypting user data:', error);
    throw new Error('Failed to encrypt user data');
  }
}

/**
 * Decrypt sensitive user data from storage
 * @param encryptedData - Encrypted user data string
 * @returns Decrypted user data
 */
export function decryptUserData(encryptedData: string): Partial<AuthUser> {
  try {
    const encrypted = JSON.parse(encryptedData);
    const decrypted = EnvEncryption.decrypt(encrypted);
    return decrypted as Partial<AuthUser>;
  } catch (error) {
    console.error('Error decrypting user data:', error);
    throw new Error('Failed to decrypt user data');
  }
}

/**
 * Validate user session and permissions
 * @param req - Next.js request object
 * @param requiredRoles - Array of required roles (future enhancement)
 * @returns User object if valid, null otherwise
 */
export async function validateUserSession(
  req: NextRequest,
  requiredRoles?: string[]
): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      await auditLogger.logAuthEvent('unauthorized_access_attempt', {
        path: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    // Future role-based access control can be implemented here
    if (requiredRoles && requiredRoles.length > 0) {
      // Check user roles against required roles
      // For now, all authenticated users have access
      await auditLogger.logAuthEvent('role_check', {
        userId: user.id,
        requiredRoles,
        timestamp: new Date().toISOString(),
      });
    }

    // Log successful validation
    await auditLogger.logAuthEvent('session_validated', {
      userId: user.id,
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    return user;
  } catch (error) {
    console.error('Error validating user session:', error);
    await auditLogger.logSecurityEvent('session_validation_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Create authentication headers for API calls
 * @param req - Next.js request object
 * @returns Headers object with auth token
 */
export async function createAuthHeaders(req?: NextRequest): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    let token: string | null = null;

    if (req) {
      const jwtToken = await getJWTToken(req);
      if (jwtToken) {
        // Create a custom JWT for API calls
        token = await createAPIToken(jwtToken);
      }
    } else {
      // Fallback to session-based token
      const session = await getAuthSession();
      if (session?.accessToken) {
        token = session.accessToken;
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error creating auth headers:', error);
  }

  return headers;
}

/**
 * Create API token from JWT payload
 * @param jwtToken - JWT token payload
 * @returns API token string
 */
async function createAPIToken(jwtToken: JWTPayload): Promise<string> {
  try {
    // Create a custom token for API calls
    const apiTokenData = {
      sub: jwtToken.sub,
      email: jwtToken.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 15), // 15 minutes
      type: 'api',
    };

    const encryptedToken = EnvEncryption.encrypt(apiTokenData);
    return Buffer.from(JSON.stringify(encryptedToken)).toString('base64');
  } catch (error) {
    console.error('Error creating API token:', error);
    throw new Error('Failed to create API token');
  }
}

/**
 * Verify API token from request headers
 * @param authHeader - Authorization header value
 * @returns JWT token payload if valid, null otherwise
 */
export async function verifyAPIToken(authHeader: string): Promise<JWTPayload | null> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Try to decode as base64
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const encryptedData = JSON.parse(decoded);
      const decryptedData = EnvEncryption.decrypt(encryptedData) as any;

      // Validate token structure
      if (!decryptedData.sub || !decryptedData.email || decryptedData.type !== 'api') {
        return null;
      }

      // Check expiration
      if (decryptedData.exp && Date.now() >= decryptedData.exp * 1000) {
        return null;
      }

      await auditLogger.logAuthEvent('api_token_verified', {
        userId: decryptedData.sub,
        timestamp: new Date().toISOString(),
      });

      return decryptedData as JWTPayload;
    } catch {
      // Fallback to regular JWT verification
      return null;
    }
  } catch (error) {
    console.error('Error verifying API token:', error);
    await auditLogger.logSecurityEvent('api_token_verification_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Refresh authentication token
 * @param refreshToken - Refresh token string
 * @returns New JWT token or null if refresh fails
 */
export async function refreshToken(refreshToken: string): Promise<JWTPayload | null> {
  try {
    // This would implement token refresh logic
    // For now, we'll log the attempt and return null
    await auditLogger.logAuthEvent('token_refresh_attempt', {
      timestamp: new Date().toISOString(),
    });

    // TODO: Implement actual token refresh based on provider
    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await auditLogger.logSecurityEvent('token_refresh_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * Security utilities for authentication
 */
export const authSecurity = {
  /**
   * Generate secure random state for OAuth flow
   */
  generateState: (): string => {
    const state = crypto.randomUUID();
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    return EnvEncryption.sign(state, Buffer.from(secret, 'utf-8'));
  },

  /**
   * Verify OAuth state parameter
   */
  verifyState: (state: string, signature: string): boolean => {
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    return EnvEncryption.verify(state, signature, Buffer.from(secret, 'utf-8'));
  },

  /**
   * Hash password for local authentication (future enhancement)
   */
  hashPassword: async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Generate secure session ID
   */
  generateSessionId: (): string => {
    return crypto.randomUUID();
  },
};

const authUtils = {
  getAuthSession,
  getJWTToken,
  isAuthenticated,
  getCurrentUser,
  validateUserSession,
  createAuthHeaders,
  verifyAPIToken,
  encryptUserData,
  decryptUserData,
  refreshToken,
  authSecurity,
};

export default authUtils;