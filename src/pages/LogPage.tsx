import { useRef, useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { todayKey, dayKeyFor } from '../utils/dates';
import { subDays, startOfWeek } from 'date-fns';
import type { FoodItem, LogEntry } from '../models';
import FoodCard from '../components/FoodCard';
import FoodForm from '../components/FoodForm';

interface LogPageProps {
  showToast: (text: string) => void;
}

interface GroupedEntry {
  foodItemId: number;
  kcalPerServing: number;
  count: number;
  totalKcal: number;
  entries: LogEntry[];
}

export default function LogPage({ showToast }: LogPageProps) {
  const today = todayKey();
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);

  const foodItems = useLiveQuery(() => db.foodItems.toArray());
  const yesterday = dayKeyFor(subDays(new Date(), 1));
  const thisWeekStart = dayKeyFor(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const lastWeekStart = dayKeyFor(subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7));

  const todayEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').equals(today).toArray(),
    [today]
  );
  const yesterdayEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').equals(yesterday).toArray(),
    [yesterday]
  );
  const thisWeekEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').between(thisWeekStart, today + '\uffff').toArray(),
    [thisWeekStart, today]
  );
  const lastWeekEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').between(lastWeekStart, thisWeekStart).toArray(),
    [lastWeekStart, thisWeekStart]
  );
  const allEntries = useLiveQuery(() => db.logEntries.toArray());

  // Sort foods by frequency + recency
  const sortedFoods = (() => {
    if (!foodItems || !allEntries) return foodItems ?? [];
    const freq = new Map<number, number>();
    const recent = new Map<number, number>();
    for (const e of allEntries) {
      freq.set(e.foodItemId, (freq.get(e.foodItemId) ?? 0) + 1);
      const prev = recent.get(e.foodItemId) ?? 0;
      if (e.timestamp > prev) recent.set(e.foodItemId, e.timestamp);
    }
    return [...foodItems].sort((a, b) => {
      const scoreA = (freq.get(a.id!) ?? 0) * 1000 + (recent.get(a.id!) ?? 0) / 1e10;
      const scoreB = (freq.get(b.id!) ?? 0) * 1000 + (recent.get(b.id!) ?? 0) / 1e10;
      return scoreB - scoreA;
    });
  })();

  const totalKcal = todayEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;
  const yesterdayKcal = yesterdayEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;
  const thisWeekKcal = thisWeekEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;
  const lastWeekKcal = lastWeekEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;

  // Group today's entries by food
  const grouped: GroupedEntry[] = (() => {
    if (!todayEntries) return [];
    const map = new Map<number, GroupedEntry>();
    for (const e of todayEntries) {
      const existing = map.get(e.foodItemId);
      if (existing) {
        existing.count++;
        existing.totalKcal += e.kcal;
        existing.entries.push(e);
      } else {
        map.set(e.foodItemId, {
          foodItemId: e.foodItemId,
          kcalPerServing: e.kcal,
          count: 1,
          totalKcal: e.kcal,
          entries: [e],
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      const latestA = Math.max(...a.entries.map((e) => e.timestamp));
      const latestB = Math.max(...b.entries.map((e) => e.timestamp));
      return latestB - latestA;
    });
  })();

  async function logFood(item: FoodItem) {
    await db.logEntries.add({
      foodItemId: item.id!,
      kcal: item.kcal,
      timestamp: Date.now(),
      dayKey: today,
    });
    showToast(`+${item.kcal} kcal — ${item.name}`);
  }

  async function addOne(group: GroupedEntry) {
    const food = foodItems?.find((f) => f.id === group.foodItemId);
    const kcal = food?.kcal ?? group.kcalPerServing;
    await db.logEntries.add({
      foodItemId: group.foodItemId,
      kcal,
      timestamp: Date.now(),
      dayKey: today,
    });
    showToast(`+${kcal} kcal — ${food?.name ?? 'food'}`);
  }

  async function removeOne(group: GroupedEntry) {
    const oldest = group.entries.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
    await db.logEntries.delete(oldest.id!);
    const food = foodItems?.find((f) => f.id === group.foodItemId);
    showToast(`-${oldest.kcal} kcal — ${food?.name ?? 'food'}`);
  }

  async function handleAddFood(data: { name: string; kcal: number; image?: Blob }) {
    await db.foodItems.add({ ...data, createdAt: Date.now() });
    setAdding(false);
    showToast(`Added ${data.name}`);
  }

  async function handleUpdateFood(data: { name: string; kcal: number; image?: Blob }) {
    if (!editing?.id) return;
    await db.foodItems.update(editing.id, data);
    setEditing(null);
    showToast(`Updated ${data.name}`);
  }

  async function handleDeleteFood() {
    if (!editing?.id) return;
    await db.foodItems.delete(editing.id);
    setEditing(null);
    showToast('Deleted');
  }

  // Show form overlay
  if (adding || editing) {
    return (
      <div className="p-4">
        <FoodForm
          initial={editing ?? undefined}
          onSave={editing ? handleUpdateFood : handleAddFood}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onDelete={editing ? handleDeleteFood : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left column: Today's log */}
      <div className="w-1/2 border-r border-slate-100 overflow-y-auto p-3 space-y-2">
        <div className="pb-2 space-y-1">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{totalKcal}</div>
            <div className="text-xs text-slate-400">kcal today</div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="bg-slate-50 rounded-lg py-1">
              <div className="text-sm font-semibold text-slate-600">{yesterdayKcal}</div>
              <div className="text-[10px] text-slate-400">yesterday</div>
            </div>
            <div className="bg-slate-50 rounded-lg py-1">
              <div className="text-sm font-semibold text-slate-600">{thisWeekKcal}</div>
              <div className="text-[10px] text-slate-400">this week</div>
            </div>
            <div className="bg-slate-50 rounded-lg py-1">
              <div className="text-sm font-semibold text-slate-600">{lastWeekKcal}</div>
              <div className="text-[10px] text-slate-400">last week</div>
            </div>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center text-slate-300 py-8 text-sm">
            Tap a food to log it
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map((group) => (
              <SwipeableLogRow
                key={group.foodItemId}
                group={group}
                foodItems={foodItems}
                onSwipeRight={() => addOne(group)}
                onSwipeLeft={() => removeOne(group)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right column: Catalogue */}
      <div className="w-1/2 overflow-y-auto p-3 space-y-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Catalogue</span>
          <button
            onClick={() => setAdding(true)}
            className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-light shadow-md active:bg-green-700"
          >
            +
          </button>
        </div>

        {sortedFoods.length === 0 ? (
          <div className="text-center text-slate-300 py-8 text-sm">
            Tap + to add food
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sortedFoods.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                onTap={() => logFood(item)}
                onLongPress={() => setEditing(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SwipeableLogRow({
  group,
  foodItems,
  onSwipeRight,
  onSwipeLeft,
}: {
  group: GroupedEntry;
  foodItems: FoodItem[] | undefined;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const food = foodItems?.find((f) => f.id === group.foodItemId);
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const dragging = useRef(false);

  const onDragStart = useCallback((x: number, y: number) => {
    startX.current = x;
    startY.current = y;
    currentX.current = 0;
    swiping.current = false;
    dragging.current = true;
  }, []);

  const onDragMove = useCallback((x: number, y: number) => {
    if (!dragging.current) return;
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) > 10) swiping.current = true;
    if (swiping.current && rowRef.current) {
      const clamped = Math.max(-80, Math.min(80, dx));
      currentX.current = clamped;
      rowRef.current.style.transform = `translateX(${clamped}px)`;
      rowRef.current.style.transition = 'none';
    }
  }, []);

  const onDragEnd = useCallback(() => {
    dragging.current = false;
    if (rowRef.current) {
      rowRef.current.style.transform = 'translateX(0)';
      rowRef.current.style.transition = 'transform 0.2s ease-out';
    }
    if (Math.abs(currentX.current) >= 60) {
      if (currentX.current > 0) onSwipeRight();
      else onSwipeLeft();
    }
    swiping.current = false;
    currentX.current = 0;
  }, [onSwipeRight, onSwipeLeft]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [onDragStart]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [onDragMove]);
  const handleTouchEnd = useCallback(() => onDragEnd(), [onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
    const onMouseMove = (ev: MouseEvent) => onDragMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      onDragEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onDragStart, onDragMove, onDragEnd]);

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-0 flex items-center justify-between px-3">
        <div className="text-red-400 font-semibold text-xs">−</div>
        <div className="text-green-500 font-semibold text-xs">+</div>
      </div>
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        className="relative bg-white rounded-lg px-2 py-2 flex items-center justify-between shadow-sm border border-slate-100 z-10 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
            className="w-6 h-6 rounded-full bg-red-50 text-red-400 font-bold text-sm flex items-center justify-center"
          >−</button>
          <span className="font-medium text-xs">{food?.name ?? '...'}</span>
          {group.count > 1 && (
            <span className="bg-green-100 text-green-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">
              ×{group.count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-xs">{group.totalKcal}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
            className="w-6 h-6 rounded-full bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center"
          >+</button>
        </div>
      </div>
    </div>
  );
}
