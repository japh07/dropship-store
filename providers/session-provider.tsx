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