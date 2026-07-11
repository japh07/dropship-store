'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { SizeForm } from '../size-form';

export default function EditSizePage() {
  const router = useRouter();
  const params = useParams<{ sizeId: string }>();
  const id = params.sizeId as Id<'sizes'>;
  const size = useQuery(api.sizes.get, { id });
  const update = useMutation(api.sizes.update);
  const remove = useMutation(api.sizes.remove);
  const [loading, setLoading] = useState(false);

  if (size === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (size === null) return <p className="text-sm text-neutral-500">Size not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Edit size</h1>
      <SizeForm
        initial={size}
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await update({ id, ...values });
            toast.success('Size updated');
            router.push('/dashboard/sizes');
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
          if (!confirm('Delete this size?')) return;
          try {
            await remove({ id });
            toast.success('Size deleted');
            router.push('/dashboard/sizes');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
          }
        }}
      >
        Delete size
      </button>
    </div>
  );
}
