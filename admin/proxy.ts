import { authkitProxy } from '@workos-inc/authkit-nextjs';

export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/sign-in'],
  },
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)',
  ],
};
