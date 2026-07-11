import { Category } from "@/types";

const getCategory = async (id: string): Promise<Category | undefined> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return undefined;

  try {
    const res = await fetch(`${baseUrl}/categories/${id}`);
    if (!res.ok) return undefined;

    return await res.json();
  } catch {
    return undefined;
  }
};

export default getCategory;
