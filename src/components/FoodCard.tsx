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
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
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
      className="group bg-neutral-850 hover:bg-neutral-800 rounded-xl px-2.5 py-2 flex items-center gap-2.5 active:scale-[0.97] transition-all duration-150 w-full text-left border border-neutral-800 hover:border-neutral-700"
    >
      {imgUrl ? (
        <img src={imgUrl} alt={item.name} className="w-9 h-9 rounded-lg object-cover shrink-0 ring-1 ring-neutral-700" />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-lg shrink-0 ring-1 ring-neutral-700">
          <span className="opacity-50">+</span>
        </div>
      )}
      <span className="font-medium text-xs text-neutral-300 group-hover:text-neutral-200 leading-tight line-clamp-1 flex-1 min-w-0 transition-colors">
        {item.name}
      </span>
      {showKcal && (
        <span className="text-[10px] text-neutral-500 font-medium tabular-nums shrink-0">{item.kcal}</span>
      )}
    </button>
  );
}
