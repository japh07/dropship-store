import { Category } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapCategory } from "@/lib/mappers";

const getCategory = async (id: string): Promise<Category | null> => {
  const supabase = createServiceClient();
  const storefrontId = getStorefrontId();
  const { data: cat } = await supabase
    .from("storefront_categories")
    .select("id, name, display_order")
    .eq("storefront_id", storefrontId).eq("id", id).single();
  if (!cat) return null;
  const { data: billboard } = await supabase
    .from("storefront_billboards")
    .select("id, label, image_url")
    .eq("storefront_id", storefrontId).eq("category_id", id)
    .order("display_order").limit(1).maybeSingle();
  return mapCategory({ ...cat, billboard });
};

export default getCategory;
