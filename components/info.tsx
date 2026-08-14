"use client";

import Currency  from "@/components/ui/currency";
import { Product } from "@/types";

// Cart/checkout is out of scope for browsing-only v1.
// The "Add To Cart" button below is intentionally hidden; the underlying
// cart store (useCart) remains in place, unused, for a future checkout
// sub-project.

interface InfoProps {
  data: Product
};

const Info: React.FC<InfoProps> = ({ data }) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-2xl text-gray-900">
          <Currency value={data?.price} />
        </p>
      </div>
      <hr className="my-4" />
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center gap-x-4">
          <h3 className="font-semibold text-black">Size:</h3>
          <div>
            {data?.size?.value}
          </div>
        </div>
        <div className="flex items-center gap-x-4">
          <h3 className="font-semibold text-black">Color:</h3>
          <div className="h-6 w-6 rounded-full border border-gray-600" style={{ backgroundColor: data?.color?.value }} />
        </div>
      </div>
    </div>
  );
}
 
export default Info;
