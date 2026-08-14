import { Product } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapProduct } from "@/lib/mappers";
import { PRODUCT_SELECT, applyProductFilters, ProductFilters } from "@/lib/productQuery";

const getProducts = async (query: ProductFilters): Promise<Product[]> => {
  const supabase = createServiceClient();
  let q = supabase.from("storefront_products").select(PRODUCT_SELECT);
  q = applyProductFilters(q as any, getStorefrontId(), query) as any;
  const { data } = await (q as any).order("display_order");
  return (data ?? []).map((row: any) =>
    mapProduct({ ...row.products, is_featured: row.is_featured, category: row.category, color: row.color, size: row.size })
  );
};

export default getProducts;
