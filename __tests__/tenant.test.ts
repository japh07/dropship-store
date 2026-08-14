import { subdomainOf } from '@/lib/tenant'

describe('subdomainOf', () => {
  it('extracts a subdomain under the base domain', () => {
    expect(subdomainOf('acme.yourpos.store', 'yourpos.store')).toBe('acme')
  })
  it('ignores www and the apex', () => {
    expect(subdomainOf('yourpos.store', 'yourpos.store')).toBeNull()
    expect(subdomainOf('www.yourpos.store', 'yourpos.store')).toBeNull()
  })
  it('returns null for a non-matching host (custom domain)', () => {
    expect(subdomainOf('shop.example.com', 'yourpos.store')).toBeNull()
  })
})
