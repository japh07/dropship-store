'use client';

import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import toast from 'react-hot-toast';

export default function SizesPage() {
  const sizes = useQuery(api.sizes.list);
  const remove = useMutation(api.sizes.remove);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sizes</h1>
        <Link href="/dashboard/sizes/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          Add size
        </Link>
      </div>
      <div className="mt-6 divide-y rounded-md border">
        {sizes === undefined && <p className="p-4 text-sm text-neutral-500">Loading...</p>}
        {sizes?.length === 0 && <p className="p-4 text-sm text-neutral-500">No sizes yet.</p>}
        {sizes?.map((size) => (
          <div key={size.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{size.name}</p>
              <p className="text-xs text-neutral-500">{size.value}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/dashboard/sizes/${size.id}`} className="text-neutral-600 hover:text-black">
                Edit
              </Link>
              <button
                type="button"
                className="text-red-600 hover:text-red-800"
                onClick={async () => {
                  if (!confirm('Delete this size?')) return;
                  try {
                    await remove({ id: size.id as Id<'sizes'> });
                    toast.success('Size deleted');
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
