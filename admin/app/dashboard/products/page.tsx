'use client';

import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const products = useQuery(api.products.list, { includeArchived: true });
  const remove = useMutation(api.products.remove);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/dashboard/products/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          Add product
        </Link>
      </div>
      <div className="mt-6 divide-y rounded-md border">
        {products === undefined && <p className="p-4 text-sm text-neutral-500">Loading...</p>}
        {products?.length === 0 && <p className="p-4 text-sm text-neutral-500">No products yet.</p>}
        {products?.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">
                {product.name}
                {product.isArchived && (
                  <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 text-xs">Archived</span>
                )}
                {product.isFeatured && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    Featured
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-500">
                {product.category?.name ?? 'No category'} · ${product.price}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/dashboard/products/${product.id}`} className="text-neutral-600 hover:text-black">
                Edit
              </Link>
              <button
                type="button"
                className="text-red-600 hover:text-red-800"
                onClick={async () => {
                  if (!confirm('Delete this product?')) return;
                  try {
                    await remove({ id: product.id as Id<'products'> });
                    toast.success('Product deleted');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to delete');
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
