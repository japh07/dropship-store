'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { CategoryForm } from '../category-form';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ categoryId: string }>();
  const id = params.categoryId as Id<'categories'>;
  const category = useQuery(api.categories.get, { id });
  const update = useMutation(api.categories.update);
  const remove = useMutation(api.categories.remove);
  const [loading, setLoading] = useState(false);

  if (category === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (category === null) return <p className="text-sm text-neutral-500">Category not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Edit category</h1>
      <CategoryForm
        initial={category}
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await update({ id, ...values });
            toast.success('Category updated');
            router.push('/dashboard/categories');
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
          if (!confirm('Delete this category?')) return;
          try {
            await remove({ id });
            toast.success('Category deleted');
            router.push('/dashboard/categories');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
          }
        }}
      >
        Delete category
      </button>
    </div>
  );
}
