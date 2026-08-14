import { applyProductFilters } from '@/lib/productQuery'

function fakeQuery() {
  const calls: any[] = []
  const q: any = {
    eq: (k: string, v: any) => { calls.push(['eq', k, v]); return q },
    calls,
  }
  return q
}

describe('applyProductFilters', () => {
  it('always scopes to storefront + published', () => {
    const q = fakeQuery()
    applyProductFilters(q, 'sf-1', {})
    expect(q.calls).toEqual([['eq', 'storefront_id', 'sf-1'], ['eq', 'is_published', true]])
  })
  it('adds category/color/size/featured when present', () => {
    const q = fakeQuery()
    applyProductFilters(q, 'sf-1', { categoryId: 'c1', colorId: 'k1', sizeId: 's1', isFeatured: true })
    expect(q.calls).toContainEqual(['eq', 'category_id', 'c1'])
    expect(q.calls).toContainEqual(['eq', 'color_id', 'k1'])
    expect(q.calls).toContainEqual(['eq', 'size_id', 's1'])
    expect(q.calls).toContainEqual(['eq', 'is_featured', true])
  })
}
)
