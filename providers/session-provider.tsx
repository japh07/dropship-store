'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface SessionProviderWrapperProps {
  children: ReactNode;
}

/**
 * SessionProvider wrapper for NextAuth.js
 * Provides authentication context to the entire application
 * - Manages JWT tokens and user sessions
 * - Handles session state and persistence
 * - Provides auth context to child components
 * - Includes security best practices for session management
 */
export default function SessionProviderWrapper({ children }: SessionProviderWrapperProps) {
  return (
    <SessionProvider
      // Enable session refetching on window focus
      refetchOnWindowFocus={true}

      // Set session refetch interval (5 minutes)
      refetchInterval={5 * 60}

      // Enable session updates in background
      sessionUpdateDelay={0}

      // Custom error handling
      onError={(error) => {
        console.error('SessionProvider error:', error);
        // Log authentication errors to audit logger
        if (typeof window !== 'undefined' && window.fetch) {
          window.fetch('/api/auth/error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {
            // Silently fail to avoid infinite loops
          });
        }
      }}

      // Custom session loading state
      loading={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      {children}
    </SessionProvider>
  );
}