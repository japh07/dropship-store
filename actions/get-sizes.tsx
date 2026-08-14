import { Size } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapSize } from "@/lib/mappers";

const getSizes = async (): Promise<Size[]> => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("storefront_sizes")
    .select("id, name, value, display_order")
    .eq("storefront_id", getStorefrontId())
    .order("display_order");
  return (data ?? []).map(mapSize);
};

export default getSizes;
