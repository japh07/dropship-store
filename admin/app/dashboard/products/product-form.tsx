'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export interface ProductFormValues {
  name: string;
  price: string;
  categoryId: Id<'categories'>;
  sizeId: Id<'sizes'>;
  colorId: Id<'colors'>;
  images: { url: string }[];
  isFeatured: boolean;
  isArchived: boolean;
}

export function ProductForm({
  initial,
  loading,
  onSubmit,
}: {
  initial?: {
    name: string;
    price: string;
    category?: { id: string } | null;
    size?: { id: string } | null;
    color?: { id: string } | null;
    images: { url: string }[];
    isFeatured: boolean;
    isArchived?: boolean;
  };
  loading: boolean;
  onSubmit: (values: ProductFormValues) => void;
}) {
  const categories = useQuery(api.categories.list);
  const sizes = useQuery(api.sizes.list);
  const colors = useQuery(api.colors.list);

  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? '');
  const [sizeId, setSizeId] = useState(initial?.size?.id ?? '');
  const [colorId, setColorId] = useState(initial?.color?.id ?? '');
  const [images, setImages] = useState<string[]>(
    initial?.images.map((i) => i.url) ?? [''],
  );
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isArchived, setIsArchived] = useState(initial?.isArchived ?? false);

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!categoryId || !sizeId || !colorId) return;
        onSubmit({
          name,
          price,
          categoryId: categoryId as Id<'categories'>,
          sizeId: sizeId as Id<'sizes'>,
          colorId: colorId as Id<'colors'>,
          images: images.filter((url) => url.trim() !== '').map((url) => ({ url })),
          isFeatured,
          isArchived,
        });
      }}
    >
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Price</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="49.99"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Category</label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Size</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={sizeId}
            onChange={(e) => setSizeId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a size
            </option>
            {sizes?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Color</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={colorId}
            onChange={(e) => setColorId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a color
            </option>
            {colors?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Images</label>
        <div className="mt-1 space-y-2">
          {images.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="w-full rounded-md border px-3 py-2"
                value={url}
                onChange={(e) => {
                  const next = [...images];
                  next[index] = e.target.value;
                  setImages(next);
                }}
                placeholder="https://..."
              />
              <button
                type="button"
                className="rounded-md border px-3 text-sm text-neutral-500 hover:text-black"
                onClick={() => setImages(images.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-neutral-600 hover:text-black"
            onClick={() => setImages([...images, ''])}
          >
            + Add image
          </button>
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isArchived} onChange={(e) => setIsArchived(e.target.checked)} />
          Archived (hidden from storefront)
        </label>
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
