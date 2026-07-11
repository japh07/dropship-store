'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { ProductForm } from '../product-form';

export default function NewProductPage() {
  const router = useRouter();
  const create = useMutation(api.products.create);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">New product</h1>
      <ProductForm
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await create(values);
            toast.success('Product created');
            router.push('/dashboard/products');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create');
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}
