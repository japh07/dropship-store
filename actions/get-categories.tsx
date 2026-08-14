import { Category } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapCategory } from "@/lib/mappers";

const getCategories = async (): Promise<Category[]> => {
  const supabase = createServiceClient();
  const storefrontId = getStorefrontId();
  const { data: cats } = await supabase
    .from("storefront_categories")
    .select("id, name, display_order")
    .eq("storefront_id", storefrontId)
    .order("display_order");
  const { data: billboards } = await supabase
    .from("storefront_billboards")
    .select("id, label, image_url, category_id, display_order")
    .eq("storefront_id", storefrontId)
    .order("display_order");
  const billboardFor = (categoryId: string) =>
    (billboards ?? []).find((b: any) => b.category_id === categoryId) ?? null;
  return (cats ?? []).map((c: any) => mapCategory({ ...c, billboard: billboardFor(c.id) }));
};

export default getCategories;
