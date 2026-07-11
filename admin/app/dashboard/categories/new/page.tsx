'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { CategoryForm } from '../category-form';

export default function NewCategoryPage() {
  const router = useRouter();
  const create = useMutation(api.categories.create);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">New category</h1>
      <CategoryForm
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await create(values);
            toast.success('Category created');
            router.push('/dashboard/categories');
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
