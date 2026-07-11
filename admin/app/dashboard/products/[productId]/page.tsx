'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ProductForm } from '../product-form';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ productId: string }>();
  const id = params.productId as Id<'products'>;
  const product = useQuery(api.products.get, { id });
  const update = useMutation(api.products.update);
  const remove = useMutation(api.products.remove);
  const [loading, setLoading] = useState(false);

  if (product === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (product === null) return <p className="text-sm text-neutral-500">Product not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Edit product</h1>
      <ProductForm
        initial={product}
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await update({ id, ...values });
            toast.success('Product updated');
            router.push('/dashboard/products');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update');
          } finally {
            setLoading(false);
          }
        }}
      />
      <button
        type="button"
        className="text-sm text-red-600 hover:text-red-800"
        onClick={async () => {
          if (!confirm('Delete this product?')) return;
          try {
            await remove({ id });
            toast.success('Product deleted');
            router.push('/dashboard/products');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
          }
        }}
      >
        Delete product
      </button>
    </div>
  );
}
