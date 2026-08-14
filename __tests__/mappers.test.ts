import { mapProduct, mapBillboard, mapColor } from '@/lib/mappers'

describe('mappers', () => {
  it('maps a billboard row', () => {
    expect(mapBillboard({ id: 'b1', label: 'Summer', image_url: 'http://x/i.png' }))
      .toEqual({ id: 'b1', label: 'Summer', imageUrl: 'http://x/i.png' })
  })

  it('maps a color row', () => {
    expect(mapColor({ id: 'c1', name: 'Black', value: '#000' }))
      .toEqual({ id: 'c1', name: 'Black', value: '#000' })
  })

  it('maps a product row: price stringified, images from jsonb, placeholders for missing color/size', () => {
    const p = mapProduct({
      id: 'p1', name: 'Tee', selling_price: 1500, is_featured: true,
      images: ['http://x/a.png'], online_image_url: null,
      category: { id: 'cat1', name: 'Shirts' }, color: null, size: null,
    })
    expect(p.price).toBe('1500')
    expect(p.isFeatured).toBe(true)
    expect(p.images).toEqual([{ id: 'p1-0', url: 'http://x/a.png' }])
    expect(p.category.name).toBe('Shirts')
    expect(p.color.name).toBe('') // neutral placeholder
    expect(p.size.name).toBe('')
  })

  it('falls back to online_image_url when images is empty', () => {
    const p = mapProduct({
      id: 'p2', name: 'Hat', selling_price: 500, is_featured: false,
      images: [], online_image_url: 'http://x/hat.png',
      category: null, color: null, size: null,
    })
    expect(p.images).toEqual([{ id: 'p2-0', url: 'http://x/hat.png' }])
  })
})
