import { NextRequest, NextResponse } from 'next/server'
import { resolveStorefront } from '@/lib/tenant'

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const storefront = await resolveStorefront(host)
  if (!storefront) {
    return new NextResponse('Not found', { status: 404 })
  }
  // Expose the resolved id on the *request* headers so Server Components and
  // actions can read it via next/headers `headers().get('x-storefront-id')`.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-storefront-id', storefront.id)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'] }
