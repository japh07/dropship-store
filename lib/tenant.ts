import { headers } from 'next/headers'
import { createServiceClient } from './supabase'

export type Storefront = {
  id: string
  store_name: string
  tagline: string | null
  logo_url: string | null
  banner_url: string | null
  primary_color: string
  template: 'general' | 'liquor' | 'electronics'
  is_age_restricted: boolean
  is_published: boolean
}

export function subdomainOf(host: string, baseDomain: string): string | null {
  const h = host.split(':')[0].toLowerCase()
  if (h === baseDomain || h === `www.${baseDomain}`) return null
  if (!h.endsWith(`.${baseDomain}`)) return null
  const sub = h.slice(0, -1 * (`.${baseDomain}`.length))
  return sub && sub !== 'www' ? sub : null
}

export async function resolveStorefront(host: string): Promise<Storefront | null> {
  const base = process.env.STOREFRONT_BASE_DOMAIN || 'yourpos.store'
  const supabase = createServiceClient()
  const cols = 'id, store_name, tagline, logo_url, banner_url, primary_color, template, is_age_restricted, is_published'

  const sub = subdomainOf(host, base) || process.env.DEV_STOREFRONT_SUBDOMAIN || null
  let row: Storefront | null = null
  if (sub) {
    const { data } = await supabase.from('storefronts').select(cols).eq('subdomain', sub).single()
    row = (data as Storefront) ?? null
  } else {
    const { data } = await supabase.from('storefronts').select(cols)
      .eq('custom_domain', host.split(':')[0]).eq('custom_domain_status', 'verified').single()
    row = (data as Storefront) ?? null
  }
  if (!row || !row.is_published) return null
  return row
}

// Set by middleware; read in Server Components / actions.
export function getStorefrontId(): string {
  const id = headers().get('x-storefront-id')
  if (!id) throw new Error('No storefront resolved for this request')
  return id
}
