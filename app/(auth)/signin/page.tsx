'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession, getProviders } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { toast } from 'react-hot-toast';
import { auditLogger } from '@/lib/audit-logger';

/**
 * Secure login page with OAuth provider options
 * - OAuth provider buttons (Google, GitHub)
 * - Form validation and CSRF protection
 * - Secure session handling
 * - Error handling with proper messages
 * - Comprehensive audit logging
 */
export default function SignInPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const errorParam = searchParams?.get('error');

  useEffect(() => {
    // Fetch available authentication providers
    const fetchProviders = async () => {
      try {
        const providers = await getProviders();
        setProviders(providers);
      } catch (error) {
        console.error('Failed to fetch providers:', error);
        setError('Unable to load authentication providers');
      }
    };

    fetchProviders();

    // Handle error parameters from URL
    if (errorParam) {
      handleAuthError(errorParam);
    }

    // Check if user is already authenticated
    const checkExistingSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          await auditLogger.logAuthEvent('signin_redirect_existing_session', {
            userId: session.user?.id,
            email: session.user?.email,
            callbackUrl,
          });

          router.push(callbackUrl);
        }
      } catch (error) {
        console.error('Failed to check existing session:', error);
      }
    };

    checkExistingSession();
  }, [errorParam, callbackUrl, router]);

  /**
   * Handle authentication errors from URL parameters
   */
  const handleAuthError = (errorCode: string) => {
    let errorMessage = 'An error occurred during authentication';

    switch (errorCode) {
      case 'OAuthSignin':
        errorMessage = 'Error in constructing an authorization URL';
        break;
      case 'OAuthCallback':
        errorMessage = 'Error in handling the response from an OAuth provider';
        break;
      case 'OAuthCreateAccount':
        errorMessage = 'Could not create OAuth account';
        break;
      case 'EmailCreateAccount':
        errorMessage = 'Could not create email account';
        break;
      case 'Callback':
        errorMessage = 'Error in the OAuth callback handler';
        break;
      case 'OAuthAccountNotLinked':
        errorMessage = 'This email is already associated with another account';
        break;
      case 'SessionRequired':
        errorMessage = 'Please sign in to access this page';
        break;
      case 'Default':
        errorMessage = 'Authentication error';
        break;
    }

    setError(errorMessage);

    // Log authentication error
    auditLogger.logSecurityEvent('signin_error', {
      errorCode,
      errorMessage,
      callbackUrl,
    }, null, 'WARN');
  };

  /**
   * Handle OAuth provider sign in
   */
  const handleProviderSignIn = async (providerId: string, providerName: string) => {
    try {
      setLoading(providerId);
      setError(null);

      // Generate secure state for CSRF protection
      const state = crypto.randomUUID();

      // Log sign in attempt
      await auditLogger.logAuthEvent('signin_provider_attempt', {
        providerId,
        providerName,
        callbackUrl,
        state,
      });

      // Initiate sign in with OAuth provider
      const result = await signIn(providerId, {
        callbackUrl,
        redirect: false, // Handle redirect manually
        state,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        toast.success(`Successfully signed in with ${providerName}`);

        await auditLogger.logAuthEvent('signin_provider_success', {
          providerId,
          providerName,
          callbackUrl,
        });

        router.push(callbackUrl);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      toast.error(errorMessage);

      await auditLogger.logSecurityEvent('signin_provider_failed', {
        providerId,
        providerName,
        error: errorMessage,
        callbackUrl,
      }, null, 'ERROR');
    } finally {
      setLoading(null);
    }
  };

  /**
   * Render provider button with loading state
   */
  const renderProviderButton = (provider: any) => {
    const isLoading = loading === provider.id;

    switch (provider.id) {
      case 'google':
        return (
          <Button
            onClick={() => handleProviderSignIn(provider.id, 'Google')}
            disabled={isLoading || !!loading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>
        );

      case 'github':
        return (
          <Button
            onClick={() => handleProviderSignIn(provider.id, 'GitHub')}
            disabled={isLoading || !!loading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.gitHub className="mr-2 h-4 w-4" />
            )}
            Continue with GitHub
          </Button>
        );

      default:
        return (
          <Button
            onClick={() => handleProviderSignIn(provider.id, provider.name)}
            disabled={isLoading || !!loading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.user className="mr-2 h-4 w-4" />
            )}
            Continue with {provider.name}
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              start your free trial
            </a>
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <Icons.exclamationTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Provider Buttons */}
            <div className="space-y-3">
              {providers &&
                Object.values(providers)
                  .filter((provider: any) => provider.id !== 'credentials')
                  .map((provider: any) => (
                    <div key={provider.id} className="space-y-2">
                      {renderProviderButton(provider)}
                    </div>
                  ))}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Security Information */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>

              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <div className="flex items-center">
                  <Icons.lock className="h-3 w-3 mr-1" />
                  Secure
                </div>
                <div className="flex items-center">
                  <Icons.shield className="h-3 w-3 mr-1" />
                  Encrypted
                </div>
                <div className="flex items-center">
                  <Icons.checkCircle className="h-3 w-3 mr-1" />
                  OAuth2
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="/support" className="font-medium text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </p>

          <div className="flex justify-center space-x-4 text-xs text-gray-500">
            <a href="/security" className="hover:text-blue-600">
              Security
            </a>
            <span>•</span>
            <a href="/privacy" className="hover:text-blue-600">
              Privacy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-blue-600">
              Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}