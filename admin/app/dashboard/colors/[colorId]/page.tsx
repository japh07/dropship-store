'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ColorForm } from '../color-form';

export default function EditColorPage() {
  const router = useRouter();
  const params = useParams<{ colorId: string }>();
  const id = params.colorId as Id<'colors'>;
  const color = useQuery(api.colors.get, { id });
  const update = useMutation(api.colors.update);
  const remove = useMutation(api.colors.remove);
  const [loading, setLoading] = useState(false);

  if (color === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (color === null) return <p className="text-sm text-neutral-500">Color not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Edit color</h1>
      <ColorForm
        initial={color}
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await update({ id, ...values });
            toast.success('Color updated');
            router.push('/dashboard/colors');
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
          if (!confirm('Delete this color?')) return;
          try {
            await remove({ id });
            toast.success('Color deleted');
            router.push('/dashboard/colors');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
          }
        }}
      >
        Delete color
      </button>
    </div>
  );
}
