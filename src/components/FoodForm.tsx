import { useState, useEffect } from 'react';
import type { FoodItem } from '../models';
import ImageCapture from './ImageCapture';

interface FoodFormProps {
  initial?: FoodItem;
  onSave: (data: { name: string; kcal: number; image?: Blob }) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

export default function FoodForm({ initial, onSave, onDelete }: FoodFormProps) {
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
    <form
      onSubmit={handleSubmit}
      className="bg-neutral-900 rounded-2xl p-5 border border-neutral-700 space-y-5"
      style={{ animation: 'fade-up 0.2s ease-out' }}
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-white">
        {initial ? 'Edit Food' : 'New Food'}
      </h2>

      <ImageCapture image={image} onChange={setImage} />

      <input
        type="text"
        placeholder="Food name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-600 rounded-xl px-4 py-4 text-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
        autoFocus
      />
      <input
        type="number"
        placeholder="Calories (kcal)"
        value={kcal}
        onChange={(e) => setKcal(e.target.value)}
        inputMode="numeric"
        className="w-full bg-neutral-800 border border-neutral-600 rounded-xl px-4 py-4 text-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
      />

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl py-4 font-bold text-lg active:scale-[0.98] transition-all"
        >
          {initial ? 'Update' : 'Add Food'}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="px-6 py-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-lg font-semibold transition-all"
          >
            Delete
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500 text-center">swipe back to cancel</p>
    </form>
  );
}
