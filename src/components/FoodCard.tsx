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
      className="group bg-neutral-850 hover:bg-neutral-800 rounded-xl px-3 py-3 flex items-center gap-3 active:scale-[0.97] transition-all duration-150 w-full text-left border border-neutral-700"
    >
      {imgUrl ? (
        <img src={imgUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-xl shrink-0 border border-neutral-700">
          <span className="text-neutral-500">+</span>
        </div>
      )}
      <span className="font-medium text-base text-neutral-100 leading-tight line-clamp-1 flex-1 min-w-0">
        {item.name}
      </span>
      {showKcal && (
        <span className="text-sm text-neutral-400 font-medium tabular-nums shrink-0">{item.kcal}</span>
      )}
    </button>
  );
}
