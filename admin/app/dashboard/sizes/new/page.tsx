'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { SizeForm } from '../size-form';

export default function NewSizePage() {
  const router = useRouter();
  const create = useMutation(api.sizes.create);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">New size</h1>
      <SizeForm
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await create(values);
            toast.success('Size created');
            router.push('/dashboard/sizes');
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
