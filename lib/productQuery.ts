export interface ProductFilters {
  categoryId?: string;
  colorId?: string;
  sizeId?: string;
  isFeatured?: boolean;
}

// The Supabase select string: storefront_products joined to products, plus the
// associated category/color/size rows for mapping.
export const PRODUCT_SELECT =
  'display_order, is_featured, category_id, color_id, size_id, ' +
  'products:product_id ( id, name, selling_price, online_image_url, images ), ' +
  'category:category_id ( id, name ), ' +
  'color:color_id ( id, name, value ), ' +
  'size:size_id ( id, name, value )';

export function applyProductFilters<T extends { eq: (k: string, v: any) => T }>(
  q: T, storefrontId: string, f: ProductFilters
): T {
  let out = q.eq('storefront_id', storefrontId).eq('is_published', true);
  if (f.categoryId) out = out.eq('category_id', f.categoryId);
  if (f.colorId) out = out.eq('color_id', f.colorId);
  if (f.sizeId) out = out.eq('size_id', f.sizeId);
  if (f.isFeatured) out = out.eq('is_featured', true);
  return out;
}
