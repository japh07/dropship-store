import { Color } from "@/types";
import { createServiceClient } from "@/lib/supabase";
import { getStorefrontId } from "@/lib/tenant";
import { mapColor } from "@/lib/mappers";

const getColors = async (): Promise<Color[]> => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("storefront_colors")
    .select("id, name, value, display_order")
    .eq("storefront_id", getStorefrontId())
    .order("display_order");
  return (data ?? []).map(mapColor);
};

export default getColors;
