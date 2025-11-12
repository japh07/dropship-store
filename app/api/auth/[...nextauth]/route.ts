import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { JWT } from 'next-auth/jwt';
import { EnvEncryption } from '@/lib/encryption';
import { auditLogger } from '@/lib/audit-logger';

/**
 * NextAuth.js configuration with OAuth2/JWT authentication
 * - OAuth providers: Google, GitHub
 * - JWT strategy for session management
 * - AES-256 session encryption
 * - Secure cookie configuration
 * - Comprehensive audit logging
 */

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: 'jwt' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    encryption: true, // Enable JWT encryption
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') : undefined,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') : undefined,
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') : undefined,
      },
    },
    pkceCodeVerifier: {
      name: `__Secure-next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') : undefined,
      },
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },

  callbacks: {
    /**
     * JWT callback - called when JWT is created or updated
     * Encrypts sensitive JWT data and adds audit logging
     */
    async jwt({ token, user, account, profile, trigger, session }: any) {
      try {
        // Initial sign in
        if (account && user) {
          await auditLogger.logAuthEvent('signin', {
            userId: user.id,
            email: user.email,
            provider: account.provider,
            timestamp: new Date().toISOString(),
          });

          // Encrypt sensitive user data in JWT
          const encryptedUserData = EnvEncryption.encrypt({
            id: user.id,
            email: user.email,
            name: user.name,
            provider: account.provider,
          });

          return {
            ...token,
            encryptedData: encryptedUserData,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            provider: account.provider,
          };
        }

        // Handle session updates
        if (trigger === 'update' && session) {
          await auditLogger.logAuthEvent('session_update', {
            userId: token.sub,
            timestamp: new Date().toISOString(),
          });

          const encryptedUserData = EnvEncryption.encrypt({
            ...session.user,
            updatedAt: new Date().toISOString(),
          });

          return {
            ...token,
            encryptedData: encryptedUserData,
          };
        }

        // Token refresh
        if (token.expiresAt && Date.now() / 1000 > token.expiresAt) {
          await auditLogger.logAuthEvent('token_refresh', {
            userId: token.sub,
            timestamp: new Date().toISOString(),
          });

          // Token would be refreshed here if provider supports it
          // For now, we'll mark it as expired
          return { ...token, error: 'SessionExpired' };
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        await auditLogger.logSecurityEvent('jwt_callback_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        return { ...token, error: 'JWTError' };
      }
    },

    /**
     * Session callback - called when session is accessed
     * Decrypts user data for client-side usage
     */
    async session({ session, token }: any) {
      try {
        // Handle JWT errors
        if (token.error) {
          session.error = token.error;
          return session;
        }

        // Decrypt user data from JWT
        if (token.encryptedData) {
          const decryptedData = EnvEncryption.decrypt(token.encryptedData) as any;

          session.user = {
            id: decryptedData.id,
            email: decryptedData.email,
            name: decryptedData.name,
            image: session.user?.image,
          };

          session.provider = decryptedData.provider;
        }

        // Add session metadata
        session.expires = new Date(token.exp * 1000).toISOString();
        session.accessToken = token.accessToken;

        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        await auditLogger.logSecurityEvent('session_callback_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Return safe session on error
        return {
          ...session,
          error: 'SessionError',
          user: { id: null, email: null, name: null, image: null },
        };
      }
    },

    /**
     * Redirect callback - controls where users are redirected after auth
     */
    async redirect({ url, baseUrl }: any) {
      try {
        // Allows relative callback URLs
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }

        // Allows callback URLs on the same origin
        if (new URL(url).origin === baseUrl) {
          return url;
        }

        return baseUrl;
      } catch (error) {
        console.error('Redirect callback error:', error);
        return baseUrl;
      }
    },

    /**
     * Sign in callback - additional validation before sign in
     */
    async signIn({ user, account, profile, email, credentials }: any) {
      try {
        // Log sign in attempt
        await auditLogger.logAuthEvent('signin_attempt', {
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          timestamp: new Date().toISOString(),
        });

        // Add additional validation logic here if needed
        // For example, email domain verification, user whitelisting, etc.

        if (user.email) {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(user.email)) {
            await auditLogger.logSecurityEvent('invalid_email_signin_attempt', {
              email: user.email,
              provider: account?.provider,
              timestamp: new Date().toISOString(),
            });
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Sign in callback error:', error);
        return false;
      }
    },
  },

  events: {
    /**
     * Sign in event - triggered after successful sign in
     */
    async signIn({ user, account, profile, isNewUser }: any) {
      try {
        await auditLogger.logAuthEvent('signin_success', {
          userId: user.id,
          email: user.email,
          provider: account.provider,
          isNewUser: isNewUser || false,
          timestamp: new Date().toISOString(),
        });

        if (isNewUser) {
          await auditLogger.logSecurityEvent('new_user_registration', {
            userId: user.id,
            email: user.email,
            provider: account.provider,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Sign in event error:', error);
      }
    },

    /**
     * Sign out event - triggered after sign out
     */
    async signOut({ session, token }: any) {
      try {
        await auditLogger.logAuthEvent('signout', {
          userId: token?.sub || session?.user?.id,
          email: session?.user?.email,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Sign out event error:', error);
      }
    },

    /**
     * Error event - triggered on authentication errors
     */
    async error(message: string, data: any) {
      try {
        await auditLogger.logSecurityEvent('auth_error', {
          message,
          data: JSON.stringify(data),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Auth error event logging failed:', error);
      }
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Security configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };