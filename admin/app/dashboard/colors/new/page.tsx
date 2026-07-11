'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { ColorForm } from '../color-form';

export default function NewColorPage() {
  const router = useRouter();
  const create = useMutation(api.colors.create);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">New color</h1>
      <ColorForm
        loading={loading}
        onSubmit={async (values) => {
          setLoading(true);
          try {
            await create(values);
            toast.success('Color created');
            router.push('/dashboard/colors');
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
