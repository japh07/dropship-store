import { Category } from "@/types";

const getCategories = async (): Promise<Category[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return [];

  try {
    const res = await fetch(`${baseUrl}/categories`);
    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
};

export default getCategories;

