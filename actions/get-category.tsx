import { Category } from "@/types";

const URL=`${process.env.NEXT_PUBLIC_API_URL}/categories`;

const getCategory = async (id: string): Promise<Category | undefined> => {
  try {
    const res = await fetch(`${URL}/${id}`);
    if (!res.ok) return undefined;

    return await res.json();
  } catch {
    return undefined;
  }
};

export default getCategory;
