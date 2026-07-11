'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { BillboardForm } from '../billboard-form';

export default function EditBillboardPage() {
  const router = useRouter();
  const params = useParams<{ billboardId: string }>();
  const id = params.billboardId as Id<'billboards'>;
  const billboard = useQuery(api.billboards.get, { id });
  const update = useMutation(api.billboards.update);
  const remove = useMutation(api.billboards.remove);
  const [loading, setLoading] = useState(false);

  if (billboard === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (billboard === null) return <p className="text-sm text-neutral-500">Billboard not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Edit billboard</h1>
      <BillboardForm
        initial={billboard}
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await update({ id, ...values });
            toast.success('Billboard updated');
            router.push('/dashboard/billboards');
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
          if (!confirm('Delete this billboard?')) return;
          try {
            await remove({ id });
            toast.success('Billboard deleted');
            router.push('/dashboard/billboards');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete');
          }
        }}
      >
        Delete billboard
      </button>
    </div>
  );
}
