'use client';

import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const categories = useQuery(api.categories.list);
  const remove = useMutation(api.categories.remove);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Categories</h1>
        <Link href="/dashboard/categories/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          Add category
        </Link>
      </div>
      <div className="mt-6 divide-y rounded-md border">
        {categories === undefined && <p className="p-4 text-sm text-neutral-500">Loading...</p>}
        {categories?.length === 0 && <p className="p-4 text-sm text-neutral-500">No categories yet.</p>}
        {categories?.map((category) => (
          <div key={category.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-xs text-neutral-500">
                Billboard: {category.billboard?.label ?? 'none'}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/dashboard/categories/${category.id}`} className="text-neutral-600 hover:text-black">
                Edit
              </Link>
              <button
                type="button"
                className="text-red-600 hover:text-red-800"
                onClick={async () => {
                  if (!confirm('Delete this category?')) return;
                  try {
                    await remove({ id: category.id as Id<'categories'> });
                    toast.success('Category deleted');
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
