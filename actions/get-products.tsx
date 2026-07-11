import { Product } from "@/types";
import qs from "query-string";

interface Query {
  categoryId?: string;
  colorId?: string;
  sizeId?: string;
  isFeatured?: boolean;
}

const getProducts = async (query: Query): Promise<Product[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return [];

  const url = qs.stringifyUrl({
    url: `${baseUrl}/products`,
    query: {
      colorId: query.colorId,
      sizeId: query.sizeId,
      categoryId: query.categoryId,
      isFeatured: query.isFeatured,
    },
  });

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
};

export default getProducts;
