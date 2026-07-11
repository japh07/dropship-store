import { Product } from "@/types";

const URL=`${process.env.NEXT_PUBLIC_API_URL}/products`;

const getProduct = async (id: string): Promise<Product | undefined> => {
  try {
    const res = await fetch(`${URL}/${id}`);
    if (!res.ok) return undefined;

    return await res.json();
  } catch {
    return undefined;
  }
};

export default getProduct;
