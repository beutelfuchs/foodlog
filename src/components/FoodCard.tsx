import { useEffect, useState, useRef, useCallback } from 'react';
import type { FoodItem } from '../models';
import { blobToUrl } from '../utils/imageUtils';

interface FoodCardProps {
  item: FoodItem;
  onTap: () => void;
  onLongPress?: () => void;
  showKcal?: boolean;
}

const LONG_PRESS_MS = 500;

export default function FoodCard({ item, onTap, onLongPress, showKcal = true }: FoodCardProps) {
  const [imgUrl, setImgUrl] = useState<string>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const longPressTriggered = useRef(false);

  useEffect(() => {
    const url = blobToUrl(item.image);
    setImgUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [item.image]);

  const startPress = useCallback(() => {
    longPressTriggered.current = false;
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    }
  }, [onLongPress]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleClick = useCallback(() => {
    if (!longPressTriggered.current) onTap();
  }, [onTap]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      className="bg-white rounded-xl shadow-sm border border-slate-100 px-2 py-2 flex items-center gap-2 active:scale-[0.98] transition-transform w-full text-left"
    >
      {imgUrl ? (
        <img src={imgUrl} alt={item.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
          🍽️
        </div>
      )}
      <span className="font-medium text-xs text-slate-700 leading-tight line-clamp-1 flex-1 min-w-0">
        {item.name}
      </span>
      {showKcal && (
        <span className="text-[10px] text-slate-400 shrink-0">{item.kcal}</span>
      )}
    </button>
  );
}
