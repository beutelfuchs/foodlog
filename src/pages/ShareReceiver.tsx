import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../db';
import { compressImage } from '../utils/imageUtils';
import type { FoodItem } from '../models';

interface ShareReceiverProps {
  sharedImage: File | null;
  setSharedImage: (f: File | null) => void;
  showToast: (text: string) => void;
}

export default function ShareReceiver({ sharedImage, setSharedImage, showToast }: ShareReceiverProps) {
  const navigate = useNavigate();
  const foods = useLiveQuery(() => db.foodItems.orderBy('name').toArray());
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!sharedImage) {
      navigate('/', { replace: true });
      return;
    }
    const url = URL.createObjectURL(sharedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sharedImage, navigate]);

  const filtered = foods?.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  async function assignToFood(item: FoodItem) {
    if (!sharedImage || !item.id) return;
    const compressed = await compressImage(sharedImage);
    await db.foodItems.update(item.id, { image: compressed });
    setSharedImage(null);
    showToast(`Photo assigned to ${item.name}`);
    navigate('/', { replace: true });
  }

  function cancel() {
    setSharedImage(null);
    navigate('/', { replace: true });
  }

  if (!sharedImage) return null;

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-white">Assign Photo</h1>
        <p className="text-sm text-neutral-400 mt-1">Swipe back to cancel</p>
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="Shared" className="w-full max-h-48 object-contain rounded-xl bg-neutral-900 border border-neutral-700" />
      )}

      <p className="text-base text-neutral-400">Select a food item to assign this photo to:</p>

      <input
        type="text"
        placeholder="Search foods..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-600 rounded-xl px-4 py-4 text-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-400 text-base">No matching foods</p>
          <p className="text-neutral-500 text-sm mt-1">Add foods first</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => assignToFood(item)}
              className="w-full bg-neutral-850 hover:bg-neutral-800 rounded-xl px-4 py-4 flex items-center gap-3 border border-neutral-700 active:scale-[0.98] transition-all"
            >
              <span className="font-semibold text-base text-white">{item.name}</span>
              <span className="text-base text-neutral-400 ml-auto tabular-nums">{item.kcal} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
