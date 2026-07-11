import { Color } from "@/types";

const getColors = async (): Promise<Color[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return [];

  try {
    const res = await fetch(`${baseUrl}/colors`);
    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
};

export default getColors;
