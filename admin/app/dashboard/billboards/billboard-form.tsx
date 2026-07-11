'use client';

import { useState } from 'react';

export function BillboardForm({
  initial,
  loading,
  onSubmit,
}: {
  initial?: { label: string; imageUrl: string };
  loading: boolean;
  onSubmit: (values: { label: string; imageUrl: string }) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ label, imageUrl });
      }}
    >
      <div>
        <label className="block text-sm font-medium">Label</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Image URL</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          required
        />
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
