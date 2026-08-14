import { Product } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapProduct } from "@/lib/mappers";
import { PRODUCT_SELECT } from "@/lib/productQuery";

const getProduct = async (id: string): Promise<Product | null> => {
  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("storefront_products")
    .select(PRODUCT_SELECT)
    .eq("storefront_id", getStorefrontId())
    .eq("is_published", true)
    .eq("product_id", id)
    .maybeSingle();
  if (!row) return null;
  const r: any = row;
  return mapProduct({ ...r.products, is_featured: r.is_featured, category: r.category, color: r.color, size: r.size });
};

export default getProduct;
