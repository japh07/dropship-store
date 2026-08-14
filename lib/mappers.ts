import { Product, Category, Billboard, Color, Size, Image } from '@/types'

export const mapBillboard = (r: any): Billboard => ({ id: r.id, label: r.label, imageUrl: r.image_url })
export const mapColor = (r: any): Color => ({ id: r.id, name: r.name, value: r.value })
export const mapSize = (r: any): Size => ({ id: r.id, name: r.name, value: r.value })

const EMPTY_COLOR: Color = { id: '', name: '', value: '' }
const EMPTY_SIZE: Size = { id: '', name: '', value: '' }

export const mapCategory = (r: any): Category => ({
  id: r.id,
  name: r.name,
  billboard: r.billboard ? mapBillboard(r.billboard) : { id: '', label: '', imageUrl: '' },
})

function mapImages(r: any): Image[] {
  const arr: string[] = Array.isArray(r.images) && r.images.length ? r.images
    : (r.online_image_url ? [r.online_image_url] : [])
  return arr.map((url, i) => ({ id: `${r.id}-${i}`, url }))
}

export const mapProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  price: String(r.selling_price),
  isFeatured: !!r.is_featured,
  category: r.category ? mapCategory(r.category) : ({ id: '', name: '', billboard: { id: '', label: '', imageUrl: '' } } as Category),
  color: r.color ? mapColor(r.color) : EMPTY_COLOR,
  size: r.size ? mapSize(r.size) : EMPTY_SIZE,
  images: mapImages(r),
})
