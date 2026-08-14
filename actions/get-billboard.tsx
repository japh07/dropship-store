import { Billboard } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapBillboard } from "@/lib/mappers";

const getBillboard = async (id: string): Promise<Billboard | null> => {
  const supabase = createServiceClient();
  const storefrontId = getStorefrontId();
  const { data } = await supabase
    .from("storefront_billboards")
    .select("id, label, image_url")
    .eq("storefront_id", storefrontId).eq("id", id).single();
  return data ? mapBillboard(data) : null;
};

export default getBillboard;
