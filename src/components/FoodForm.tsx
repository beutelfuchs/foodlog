import { useState, useEffect } from 'react';
import type { FoodItem } from '../models';
import ImageCapture from './ImageCapture';

interface FoodFormProps {
  initial?: FoodItem;
  onSave: (data: { name: string; kcal: number; image?: Blob }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function FoodForm({ initial, onSave, onCancel, onDelete }: FoodFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kcal, setKcal] = useState(initial?.kcal?.toString() ?? '');
  const [image, setImage] = useState<Blob | undefined>(initial?.image);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setKcal(initial.kcal.toString());
      setImage(initial.image);
    }
  }, [initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const k = parseInt(kcal, 10);
    if (!name.trim() || isNaN(k) || k <= 0) return;
    onSave({ name: name.trim(), kcal: k, image });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
      <ImageCapture image={image} onChange={setImage} />
      <input
        type="text"
        placeholder="Food name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        autoFocus
      />
      <input
        type="number"
        placeholder="Calories (kcal)"
        value={kcal}
        onChange={(e) => setKcal(e.target.value)}
        inputMode="numeric"
        className="w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white rounded-lg py-3 font-semibold text-base active:bg-green-700"
        >
          {initial ? 'Update' : 'Add Food'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 rounded-lg border border-slate-200 text-slate-500 text-base"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-3 rounded-lg bg-red-50 text-red-500 text-base"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
