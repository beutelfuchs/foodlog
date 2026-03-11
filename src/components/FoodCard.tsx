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

  const touchMoved = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const startPress = useCallback((x?: number, y?: number) => {
    longPressTriggered.current = false;
    touchMoved.current = false;
    if (x !== undefined && y !== undefined) {
      startPos.current = { x, y };
    }
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        if (!touchMoved.current) {
          longPressTriggered.current = true;
          onLongPress();
        }
      }, LONG_PRESS_MS);
    }
  }, [onLongPress]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touchMoved.current = true;
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!longPressTriggered.current) onTap();
  }, [onTap]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={(e) => startPress(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={cancelPress}
      onTouchMove={handleTouchMove}
      onMouseDown={() => startPress()}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      className="group bg-neutral-850 hover:bg-neutral-800 rounded-xl px-3 py-3 flex items-center gap-3 active:scale-[0.97] transition-all duration-150 w-full text-left border-2 border-neutral-700"
    >
      {imgUrl ? (
        <img src={imgUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-neutral-800 flex items-center justify-center text-2xl shrink-0 border border-neutral-600">
          <span className="text-neutral-400">+</span>
        </div>
      )}
      <span className="font-bold text-lg text-white leading-tight line-clamp-1 flex-1 min-w-0">
        {item.name}
      </span>
      {showKcal && (
        <span className="text-base text-cyan-300 font-bold tabular-nums shrink-0">{item.kcal}</span>
      )}
    </button>
  );
}
