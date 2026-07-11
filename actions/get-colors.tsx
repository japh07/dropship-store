import { Color } from "@/types";

const URL=`${process.env.NEXT_PUBLIC_API_URL}/colors`;

const getColors = async (): Promise<Color[]> => {
  try {
    const res = await fetch(URL);
    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
};

export default getColors;
