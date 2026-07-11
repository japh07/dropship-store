import { Product } from "@/types";

const getProduct = async (id: string): Promise<Product | undefined> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return undefined;

  try {
    const res = await fetch(`${baseUrl}/products/${id}`);
    if (!res.ok) return undefined;

    return await res.json();
  } catch {
    return undefined;
  }
};

export default getProduct;
