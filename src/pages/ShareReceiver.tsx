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
    navigate('/catalogue', { replace: true });
  }

  function cancel() {
    setSharedImage(null);
    navigate('/', { replace: true });
  }

  if (!sharedImage) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Assign Photo</h1>
        <button onClick={cancel} className="text-slate-400 text-sm">Cancel</button>
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="Shared" className="w-full max-h-48 object-contain rounded-xl bg-slate-100" />
      )}

      <p className="text-sm text-slate-500">Select a food item to assign this photo to:</p>

      <input
        type="text"
        placeholder="Search foods..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <p>No matching foods</p>
          <p className="text-sm mt-1">Add foods in the Catalogue first</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => assignToFood(item)}
              className="w-full bg-white rounded-lg px-3 py-3 flex items-center gap-3 shadow-sm border border-slate-100 active:bg-slate-50"
            >
              <span className="font-medium text-sm">{item.name}</span>
              <span className="text-xs text-slate-400 ml-auto">{item.kcal} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
