'use client';

import { useState } from 'react';

export function ColorForm({
  initial,
  loading,
  onSubmit,
}: {
  initial?: { name: string; value: string };
  loading: boolean;
  onSubmit: (values: { name: string; value: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [value, setValue] = useState(initial?.value ?? '#000000');

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, value });
      }}
    >
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Black"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Value</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            className="h-10 w-14 rounded-md border"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={(e) => setValue(e.target.value)}
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#000000"
            required
          />
        </div>
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
