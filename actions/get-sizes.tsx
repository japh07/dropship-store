import { Size } from "@/types";

const getSizes = async (): Promise<Size[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return [];

  try {
    const res = await fetch(`${baseUrl}/sizes`);
    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
};

export default getSizes;
