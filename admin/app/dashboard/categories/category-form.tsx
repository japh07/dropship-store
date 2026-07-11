'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export function CategoryForm({
  initial,
  loading,
  onSubmit,
}: {
  initial?: { name: string; billboard?: { id: string } | null };
  loading: boolean;
  onSubmit: (values: { name: string; billboardId: Id<'billboards'> }) => void;
}) {
  const billboards = useQuery(api.billboards.list);
  const [name, setName] = useState(initial?.name ?? '');
  const [billboardId, setBillboardId] = useState(initial?.billboard?.id ?? '');

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!billboardId) return;
        onSubmit({ name, billboardId: billboardId as Id<'billboards'> });
      }}
    >
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shoes"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Billboard</label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={billboardId}
          onChange={(e) => setBillboardId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select a billboard
          </option>
          {billboards?.map((billboard) => (
            <option key={billboard.id} value={billboard.id}>
              {billboard.label}
            </option>
          ))}
        </select>
        {billboards?.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">Create a billboard first.</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}
