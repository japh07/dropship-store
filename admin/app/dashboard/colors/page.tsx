'use client';

import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import toast from 'react-hot-toast';

export default function ColorsPage() {
  const colors = useQuery(api.colors.list);
  const remove = useMutation(api.colors.remove);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Colors</h1>
        <Link href="/dashboard/colors/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          Add color
        </Link>
      </div>
      <div className="mt-6 divide-y rounded-md border">
        {colors === undefined && <p className="p-4 text-sm text-neutral-500">Loading...</p>}
        {colors?.length === 0 && <p className="p-4 text-sm text-neutral-500">No colors yet.</p>}
        {colors?.map((color) => (
          <div key={color.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span
                className="h-5 w-5 rounded-full border"
                style={{ backgroundColor: color.value }}
              />
              <div>
                <p className="font-medium">{color.name}</p>
                <p className="text-xs text-neutral-500">{color.value}</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/dashboard/colors/${color.id}`} className="text-neutral-600 hover:text-black">
                Edit
              </Link>
              <button
                type="button"
                className="text-red-600 hover:text-red-800"
                onClick={async () => {
                  if (!confirm('Delete this color?')) return;
                  try {
                    await remove({ id: color.id as Id<'colors'> });
                    toast.success('Color deleted');
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
