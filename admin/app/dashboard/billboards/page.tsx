'use client';

import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import toast from 'react-hot-toast';

export default function BillboardsPage() {
  const billboards = useQuery(api.billboards.list);
  const remove = useMutation(api.billboards.remove);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Billboards</h1>
        <Link href="/dashboard/billboards/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          Add billboard
        </Link>
      </div>
      <div className="mt-6 divide-y rounded-md border">
        {billboards === undefined && <p className="p-4 text-sm text-neutral-500">Loading...</p>}
        {billboards?.length === 0 && <p className="p-4 text-sm text-neutral-500">No billboards yet.</p>}
        {billboards?.map((billboard) => (
          <div key={billboard.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{billboard.label}</p>
              <p className="text-xs text-neutral-500">{billboard.imageUrl}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/dashboard/billboards/${billboard.id}`} className="text-neutral-600 hover:text-black">
                Edit
              </Link>
              <button
                type="button"
                className="text-red-600 hover:text-red-800"
                onClick={async () => {
                  if (!confirm('Delete this billboard?')) return;
                  try {
                    await remove({ id: billboard.id as Id<'billboards'> });
                    toast.success('Billboard deleted');
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
