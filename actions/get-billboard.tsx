import { Billboard } from "@/types";

const getBillboard = async (id: string): Promise<Billboard | undefined> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return undefined;

  try {
    const res = await fetch(`${baseUrl}/billboards/${id}`);
    if (!res.ok) return undefined;

    return await res.json();
  } catch {
    return undefined;
  }
};

export default getBillboard;
