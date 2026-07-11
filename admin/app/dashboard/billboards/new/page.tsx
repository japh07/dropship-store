'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { BillboardForm } from '../billboard-form';

export default function NewBillboardPage() {
  const router = useRouter();
  const create = useMutation(api.billboards.create);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">New billboard</h1>
      <BillboardForm
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await create(values);
            toast.success('Billboard created');
            router.push('/dashboard/billboards');
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
